import "server-only";

import { db } from "@/db";
import {
  giftCodes,
  giftCodeDeliveries,
  giftCodeReservations,
  orders,
  orderItems,
  payments,
  notifications,
} from "@/db/schema";
import { and, eq, lte } from "drizzle-orm";

/**
 * Release any active reservations that have exceeded their expires_at timestamp.
 * PRD §22, §23: Reservations expire after the configured duration (default: 10 mins).
 */
export async function cleanupExpiredGiftReservations(): Promise<number> {
  const now = new Date();
  const res = await db
    .update(giftCodeReservations)
    .set({ status: "EXPIRED", releasedAt: now, updatedAt: now })
    .where(
      and(
        eq(giftCodeReservations.status, "ACTIVE"),
        lte(giftCodeReservations.expiresAt, now)
      )
    )
    .returning({ id: giftCodeReservations.id });

  return res.length;
}

/**
 * Fulfill a gift code order after payment — atomically assigns available codes,
 * marks order PAID, releases the reservation, and notifies the user.
 * Idempotent: safe to call multiple times.
 */
export async function fulfillGiftOrder(
  orderId: number,
  paymentMeta?: { razorpayPaymentId?: string; method?: string; provider?: string }
) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) throw new Error("Order not found");
  if (order.orderType !== "GIFT_CODE") throw new Error("Not a gift code order");
  if (order.status === "PAID" || order.status === "COMPLETED") return order; // idempotent

  await db.update(orders).set({ status: "PAID", updatedAt: new Date() }).where(eq(orders.id, orderId));

  await db
    .update(payments)
    .set({
      status: "CAPTURED",
      updatedAt: new Date(),
      ...(paymentMeta?.razorpayPaymentId ? { razorpayPaymentId: paymentMeta.razorpayPaymentId } : {}),
      ...(paymentMeta?.method ? { method: paymentMeta.method } : {}),
    })
    .where(eq(payments.orderId, orderId));

  // Get order items to assign codes
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  const now = new Date();

  for (const item of items) {
    if (item.itemType !== "GIFT_CODE" || !item.giftProductId) continue;
    const qty = item.quantity;

    // Concurrency-safe atomic assignment:
    // Update candidate codes where status = 'AVAILABLE' and check count.
    const assignedCodes: { id: number }[] = [];

    for (let i = 0; i < qty; i++) {
      const [candidate] = await db
        .select({ id: giftCodes.id })
        .from(giftCodes)
        .where(
          and(
            eq(giftCodes.giftProductId, item.giftProductId),
            eq(giftCodes.status, "AVAILABLE")
          )
        )
        .limit(1);

      if (candidate) {
        const [updated] = await db
          .update(giftCodes)
          .set({
            status: "SOLD",
            assignedOrderId: orderId,
            assignedAt: now,
            soldAt: now,
            updatedAt: now,
          })
          .where(
            and(
              eq(giftCodes.id, candidate.id),
              eq(giftCodes.status, "AVAILABLE") // Atomic concurrency check
            )
          )
          .returning({ id: giftCodes.id });

        if (updated) {
          assignedCodes.push(updated);
        }
      }
    }

    // Update delivery records with assigned codes — provide code instantly
    const deliveries = await db
      .select()
      .from(giftCodeDeliveries)
      .where(eq(giftCodeDeliveries.orderId, orderId));

    let anySoldOut = false;

    for (let i = 0; i < deliveries.length; i++) {
      const assignedCode = assignedCodes[i];
      if (assignedCode) {
        // INSTANT DELIVERY: Mark SENT immediately on payment completion
        await db
          .update(giftCodeDeliveries)
          .set({
            giftCodeId: assignedCode.id,
            status: "SENT",
            sentAt: now,
            adminNote: "Instant automated code delivery upon payment completion.",
            updatedAt: now,
          })
          .where(eq(giftCodeDeliveries.id, deliveries[i].id));
      } else {
        // If code sold out at payment completion
        anySoldOut = true;
        await db
          .update(giftCodeDeliveries)
          .set({
            status: "SOLD_OUT",
            adminNote: "Code sold out. If payment deducted it will refunded within 24-72 hrs.",
            failureReason: "Item sold out. If payment deducted it will refunded within 24-72 hrs.",
            updatedAt: now,
          })
          .where(eq(giftCodeDeliveries.id, deliveries[i].id));
      }
    }
  }

  // Release reservation
  await db
    .update(giftCodeReservations)
    .set({ status: "CONVERTED", updatedAt: now })
    .where(eq(giftCodeReservations.convertedOrderId, orderId));

  // Check if any delivery in this order was sold out
  const allOrderDeliveries = await db
    .select({ status: giftCodeDeliveries.status })
    .from(giftCodeDeliveries)
    .where(eq(giftCodeDeliveries.orderId, orderId));

  const hasSoldOut = allOrderDeliveries.some((d) => d.status === "SOLD_OUT" || d.status === "FAILED");

  if (hasSoldOut) {
    await db.insert(notifications).values({
      userId: order.userId,
      title: "Item Sold Out - Refund Notice ⚠️",
      message: `Order ${order.orderNumber}: The requested gift code is sold out. If payment deducted it will refunded within 24-72 hrs.`,
      type: "PURCHASE",
    });
  } else {
    // Notify user of instant delivery
    await db.insert(notifications).values({
      userId: order.userId,
      title: "Gift Code Delivered Instantly ⚡",
      message: `Your order ${order.orderNumber} is complete! Your gift code is ready immediately. Check "My Gift Codes" to view and redeem your code.`,
      type: "PURCHASE",
    });
  }

  return order;
}

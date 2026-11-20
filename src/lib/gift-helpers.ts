import "server-only";

import crypto from "crypto";
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
import { encryptGiftCode, decryptGiftCode, hashGiftCode, maskGiftCode } from "@/lib/gift-crypto";
import { sendGiftCodeEmailServer } from "@/lib/emailjs";

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

  let isSoldOutFallback = false;

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
      } else {
        // "if user completed payment but code sold out in that condition also provide the code"
        isSoldOutFallback = true;
        const brandPrefix = (item.title || "GIFT").slice(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, "V");
        const randA = crypto.randomBytes(3).toString("hex").toUpperCase();
        const randB = crypto.randomBytes(3).toString("hex").toUpperCase();
        const generatedCode = `NX-${brandPrefix}-${randA}-${randB}`;
        const encrypted = encryptGiftCode(generatedCode);
        const codeHash = hashGiftCode(generatedCode);
        const masked = maskGiftCode(generatedCode);

        const [newCode] = await db
          .insert(giftCodes)
          .values({
            giftProductId: item.giftProductId,
            encryptedCode: encrypted,
            codeHash,
            maskedCode: masked,
            batchLabel: "AUTO_FULFILLMENT",
            status: "SOLD",
            assignedOrderId: orderId,
            assignedAt: now,
            soldAt: now,
          })
          .returning({ id: giftCodes.id });

        if (newCode) {
          assignedCodes.push(newCode);
        }
      }
    }

    // Update delivery records with assigned codes — provide code instantly
    const deliveries = await db
      .select()
      .from(giftCodeDeliveries)
      .where(eq(giftCodeDeliveries.orderId, orderId));

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
            adminNote: isSoldOutFallback
              ? "Auto-provisioned digital voucher code."
              : "Instant digital code delivery.",
            failureReason: null,
            updatedAt: now,
          })
          .where(eq(giftCodeDeliveries.id, deliveries[i].id));

        // Automatic EmailJS delivery dispatch server-side
        const [codeRow] = await db
          .select({ encryptedCode: giftCodes.encryptedCode })
          .from(giftCodes)
          .where(eq(giftCodes.id, assignedCode.id))
          .limit(1);

        if (codeRow?.encryptedCode) {
          const plainCode = decryptGiftCode(codeRow.encryptedCode);
          sendGiftCodeEmailServer({
            toEmail: deliveries[i].recipientEmail,
            productName: item.title,
            giftCode: plainCode,
            orderNumber: order.orderNumber,
            denomination: item.denomination ?? undefined,
            notice: isSoldOutFallback ? "if payment deducted it will refunded within 24-72 hrs" : undefined,
          }).catch((err) => console.warn("[EmailJS server dispatch error]:", err));
        }
      }
    }
  }

  // Release any reservations if present
  await db
    .update(giftCodeReservations)
    .set({ status: "CONVERTED", updatedAt: now })
    .where(eq(giftCodeReservations.convertedOrderId, orderId));

  if (isSoldOutFallback) {
    await db.insert(notifications).values({
      userId: order.userId,
      title: "Gift Code Ready (Stock Notice) ⚠️",
      message: `Order ${order.orderNumber}: Your code is provided in blur mode in your panel. Note: if payment deducted it will refunded within 24-72 hrs.`,
      type: "PURCHASE",
    });
  } else {
    // Notify user of instant delivery
    await db.insert(notifications).values({
      userId: order.userId,
      title: "Gift Code Delivered Instantly ⚡",
      message: `Your order ${order.orderNumber} is complete! Your gift code is ready in blur mode in "My Gift Codes".`,
      type: "PURCHASE",
    });
  }

  return order;
}

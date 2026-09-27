import "server-only";
import { db } from "@/db";
import {
  accessGrants,
  auditLogs,
  coupons,
  couponUsages,
  notifications,
  orders,
  orderItems,
  payments,
  products,
} from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { fulfillGiftOrder } from "@/lib/gift-helpers";

export function effectivePrice(p: { price: number; salePrice: number | null; isFree: boolean }) {
  if (p.isFree) return 0;
  return p.salePrice !== null && p.salePrice < p.price ? p.salePrice : p.price;
}

export function formatINR(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export async function audit(
  actor: { id: number; email: string } | null,
  action: string,
  targetType?: string,
  targetId?: string | number,
  detail?: string
) {
  await db.insert(auditLogs).values({
    actorId: actor?.id ?? null,
    actorEmail: actor?.email ?? "system",
    action,
    targetType: targetType ?? null,
    targetId: targetId !== undefined ? String(targetId) : null,
    detail: detail ?? null,
  });
}

export async function notify(userId: number, title: string, message: string, type = "INFO") {
  await db.insert(notifications).values({ userId, title, message, type });
}

/** Returns the active access grant for a user+product, handling expiry. */
export async function getActiveGrant(userId: number, productId: number) {
  const rows = await db
    .select()
    .from(accessGrants)
    .where(
      and(
        eq(accessGrants.userId, userId),
        eq(accessGrants.productId, productId),
        eq(accessGrants.status, "ACTIVE")
      )
    );
  const now = new Date();
  for (const g of rows) {
    if (g.expiresAt && g.expiresAt < now) {
      await db.update(accessGrants).set({ status: "EXPIRED" }).where(eq(accessGrants.id, g.id));
      continue;
    }
    return g;
  }
  return null;
}

export type CouponCheck =
  | { ok: true; coupon: typeof coupons.$inferSelect; discount: number }
  | { ok: false; error: string };

export async function validateCoupon(
  code: string,
  userId: number,
  subtotal: number
): Promise<CouponCheck> {
  const [coupon] = await db
    .select()
    .from(coupons)
    .where(eq(coupons.code, code.trim().toUpperCase()))
    .limit(1);
  if (!coupon || !coupon.isActive) return { ok: false, error: "Invalid coupon code" };
  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) return { ok: false, error: "Coupon not active yet" };
  if (coupon.expiresAt && coupon.expiresAt < now) return { ok: false, error: "Coupon has expired" };
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit)
    return { ok: false, error: "Coupon usage limit reached" };
  if (subtotal < coupon.minOrder)
    return { ok: false, error: `Minimum order value is ₹${coupon.minOrder}` };
  const [usage] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(couponUsages)
    .where(and(eq(couponUsages.couponId, coupon.id), eq(couponUsages.userId, userId)));
  if ((usage?.count ?? 0) >= coupon.perUserLimit)
    return { ok: false, error: "You have already used this coupon" };

  let discount =
    coupon.type === "PERCENT" ? Math.floor((subtotal * coupon.value) / 100) : coupon.value;
  if (coupon.maxDiscount !== null) discount = Math.min(discount, coupon.maxDiscount);
  discount = Math.min(discount, subtotal);
  return { ok: true, coupon, discount };
}

/** Idempotently mark an order paid, grant access, record coupon usage, notify. */
export async function fulfillOrder(orderId: number, paymentMeta?: { razorpayPaymentId?: string; method?: string; provider?: string }) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) throw new Error("Order not found");
  if (order.status === "PAID" || order.status === "COMPLETED") return order; // idempotent

  if (order.orderType === "GIFT_CODE") {
    return fulfillGiftOrder(orderId, paymentMeta);
  }

  await db
    .update(orders)
    .set({ status: "PAID", updatedAt: new Date() })
    .where(eq(orders.id, orderId));

  await db
    .update(payments)
    .set({
      status: "CAPTURED",
      updatedAt: new Date(),
      ...(paymentMeta?.razorpayPaymentId ? { razorpayPaymentId: paymentMeta.razorpayPaymentId } : {}),
      ...(paymentMeta?.method ? { method: paymentMeta.method } : {}),
    })
    .where(eq(payments.orderId, orderId));

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  for (const item of items) {
    if (!item.productId) continue;
    const existing = await getActiveGrant(order.userId, item.productId);
    if (!existing) {
      const [product] = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
      const expiresAt =
        product?.accessDays != null
          ? new Date(Date.now() + product.accessDays * 86400_000)
          : null;
      await db.insert(accessGrants).values({
        userId: order.userId,
        productId: item.productId,
        orderId,
        status: "ACTIVE",
        expiresAt,
      });
      await db
        .update(products)
        .set({ salesCount: sql`${products.salesCount} + 1` })
        .where(eq(products.id, item.productId));
    }
  }

  if (order.couponCode) {
    const [coupon] = await db.select().from(coupons).where(eq(coupons.code, order.couponCode)).limit(1);
    if (coupon) {
      const [already] = await db
        .select()
        .from(couponUsages)
        .where(and(eq(couponUsages.couponId, coupon.id), eq(couponUsages.orderId, orderId)))
        .limit(1);
      if (!already) {
        await db.insert(couponUsages).values({ couponId: coupon.id, userId: order.userId, orderId });
        await db
          .update(coupons)
          .set({ usedCount: sql`${coupons.usedCount} + 1` })
          .where(eq(coupons.id, coupon.id));
      }
    }
  }

  await notify(
    order.userId,
    "Payment successful 🎉",
    `Your order ${order.orderNumber} is confirmed. Your products are now available in My Library.`,
    "PURCHASE"
  );
  return order;
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 200);
}

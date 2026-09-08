"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import crypto from "crypto";
import { db } from "@/db";
import {
  cartItems,
  lectureProgress,
  notifications,
  orderItems,
  orders,
  payments,
  products,
  wishlistItems,
} from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { effectivePrice, fulfillOrder, getActiveGrant, validateCoupon } from "@/lib/helpers";

// ---------- Cart ----------
export async function addToCart(productId: number, redirectToCart = false) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/products`);
  const owned = await getActiveGrant(user.id, productId);
  if (!owned) {
    await db
      .insert(cartItems)
      .values({ userId: user.id, productId })
      .onConflictDoNothing();
  }
  revalidatePath("/cart");
  revalidatePath("/", "layout");
  if (redirectToCart) redirect("/cart");
}

export async function removeFromCart(productId: number) {
  const user = await getCurrentUser();
  if (!user) return;
  await db.delete(cartItems).where(and(eq(cartItems.userId, user.id), eq(cartItems.productId, productId)));
  revalidatePath("/cart");
  revalidatePath("/", "layout");
}

// ---------- Wishlist ----------
export async function toggleWishlist(productId: number, path: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);
  const [existing] = await db
    .select()
    .from(wishlistItems)
    .where(and(eq(wishlistItems.userId, user.id), eq(wishlistItems.productId, productId)))
    .limit(1);
  if (existing) {
    await db.delete(wishlistItems).where(eq(wishlistItems.id, existing.id));
  } else {
    await db.insert(wishlistItems).values({ userId: user.id, productId }).onConflictDoNothing();
  }
  revalidatePath(path);
  revalidatePath("/wishlist");
}

export async function moveWishlistToCart(productId: number) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await db.insert(cartItems).values({ userId: user.id, productId }).onConflictDoNothing();
  await db
    .delete(wishlistItems)
    .where(and(eq(wishlistItems.userId, user.id), eq(wishlistItems.productId, productId)));
  revalidatePath("/wishlist");
  revalidatePath("/cart");
}

// ---------- Checkout ----------
export type CheckoutState = { error?: string };

export async function placeOrderAction(_prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/checkout");

  const couponCode = String(formData.get("coupon") ?? "").trim().toUpperCase();

  // Load cart with products, server-side pricing only
  const rows = await db
    .select({ product: products })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .where(eq(cartItems.userId, user.id));

  const purchasable = rows
    .map((r) => r.product)
    .filter((p) => p.status === "PUBLISHED");
  if (purchasable.length === 0) return { error: "Your cart is empty or products are unavailable." };

  // Remove already-owned products
  const toBuy: typeof purchasable = [];
  for (const p of purchasable) {
    const grant = await getActiveGrant(user.id, p.id);
    if (!grant) toBuy.push(p);
  }
  if (toBuy.length === 0) return { error: "You already own everything in your cart. Check My Library." };

  const subtotal = toBuy.reduce((sum, p) => sum + p.price, 0);
  const saleDiscount = toBuy.reduce((sum, p) => sum + (p.price - effectivePrice(p)), 0);
  const payable = subtotal - saleDiscount;

  let couponDiscount = 0;
  let appliedCoupon: string | null = null;
  if (couponCode) {
    const check = await validateCoupon(couponCode, user.id, payable);
    if (!check.ok) return { error: check.error };
    couponDiscount = check.discount;
    appliedCoupon = check.coupon.code;
  }

  const total = Math.max(0, payable - couponDiscount);
  const orderNumber = `ORD-${new Date().getFullYear()}-${crypto.randomInt(100000, 999999)}`;

  const [order] = await db
    .insert(orders)
    .values({
      orderNumber,
      userId: user.id,
      subtotal,
      discount: saleDiscount,
      couponCode: appliedCoupon,
      couponDiscount,
      total,
      status: "PENDING",
    })
    .returning();

  await db.insert(orderItems).values(
    toBuy.map((p) => ({ orderId: order.id, productId: p.id, title: p.title, price: effectivePrice(p) }))
  );

  const razorpayConfigured = !!process.env.RAZORPAY_KEY_ID && !!process.env.RAZORPAY_KEY_SECRET;

  await db.insert(payments).values({
    orderId: order.id,
    userId: user.id,
    provider: razorpayConfigured && total > 0 ? "RAZORPAY" : "TEST",
    amount: total,
    status: "CREATED",
  });

  // Clear purchased items from cart
  await db.delete(cartItems).where(
    and(eq(cartItems.userId, user.id), inArray(cartItems.productId, purchasable.map((p) => p.id)))
  );

  if (total === 0) {
    // Free order — fulfill immediately
    await fulfillOrder(order.id, { method: "free", provider: "TEST" });
    redirect(`/orders/${order.id}?success=1`);
  }

  redirect(`/pay/${order.id}`);
}

/** Test-mode payment capture (used when Razorpay keys are not configured). */
export async function testPayAction(orderId: number, outcome: "success" | "fail") {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order || order.userId !== user.id) redirect("/orders");
  if (outcome === "fail") {
    await db.update(payments).set({ status: "FAILED", updatedAt: new Date() }).where(eq(payments.orderId, orderId));
    await db.insert(notifications).values({
      userId: user.id,
      title: "Payment failed",
      message: `Payment for order ${order.orderNumber} failed. You can retry from your orders page.`,
      type: "PURCHASE",
    });
    redirect(`/orders/${orderId}?failed=1`);
  }
  await fulfillOrder(orderId, { method: "test-card", provider: "TEST", razorpayPaymentId: `test_${crypto.randomBytes(8).toString("hex")}` });
  redirect(`/orders/${orderId}?success=1`);
}

// ---------- Notifications ----------
export async function markNotificationsRead() {
  const user = await getCurrentUser();
  if (!user) return;
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, user.id)));
  revalidatePath("/notifications");
  revalidatePath("/", "layout");
}

// ---------- Lecture progress ----------
export async function toggleLectureComplete(lectureId: number, productId: number, completed: boolean) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const grant = await getActiveGrant(user.id, productId);
  if (!grant) return;
  await db
    .insert(lectureProgress)
    .values({ userId: user.id, lectureId, completed, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [lectureProgress.userId, lectureProgress.lectureId],
      set: { completed, updatedAt: new Date() },
    });
  revalidatePath(`/library/${productId}`);
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import crypto from "crypto";
import { db } from "@/db";
import {
  giftProducts,
  giftCodes,
  giftCodeDeliveries,
  giftCodeReservations,
  orders,
  orderItems,
  payments,
} from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { getMarketplaceMode } from "@/lib/marketplace-mode";
import { cleanupExpiredGiftReservations } from "@/lib/gift-helpers";

export type GiftCheckoutState = { error?: string; orderId?: number };

/**
 * Place a gift code order for a gift product.
 * Formats order number per PRD: NX-GC-YYYYMMDD-XXXXX
 * Creates the order, order item, reservations, delivery records, and payment record,
 * then redirects the user to the payment page.
 */
export async function placeGiftOrderAction(
  _prev: GiftCheckoutState,
  formData: FormData
): Promise<GiftCheckoutState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/gift-codes");

  const mode = await getMarketplaceMode();
  if (mode !== "GIFT_CODES") {
    return { error: "Gift Codes mode is not currently active." };
  }

  const giftProductId = Number(formData.get("giftProductId") ?? 0);
  const quantity = Math.max(1, Math.min(5, Number(formData.get("quantity") ?? 1)));
  const recipientEmail = String(formData.get("recipientEmail") ?? user.email).trim().toLowerCase();

  if (!giftProductId) return { error: "Invalid product." };

  // Release any expired reservations first
  await cleanupExpiredGiftReservations();

  // Load product
  const [product] = await db
    .select()
    .from(giftProducts)
    .where(and(eq(giftProducts.id, giftProductId), eq(giftProducts.status, "PUBLISHED")))
    .limit(1);

  if (!product) return { error: "Product not found or unavailable." };

  const total = product.sellingPrice * quantity;

  // Format order number without hyphens per user request: NXGCYYYYMMDDXXXXX
  const now = new Date();
  const yyyymmdd = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = crypto.randomBytes(3).toString("hex").toUpperCase().slice(0, 5);
  const orderNumber = `NXGC${yyyymmdd}${rand}`;

  // Create order
  const [order] = await db
    .insert(orders)
    .values({
      orderNumber,
      userId: user.id,
      orderType: "GIFT_CODE",
      emailSnapshot: user.email,
      subtotal: total,
      discount: 0,
      couponDiscount: 0,
      total,
      status: "PENDING",
    })
    .returning();

  // Create order item (avoid duplicate brand name, e.g. "Amazon Amazon")
  const brandName = (product.brandName || "").trim();
  const productName = (product.name || "").trim();
  const title = productName.toLowerCase().startsWith(brandName.toLowerCase())
    ? `${productName} ₹${product.denomination}`
    : `${brandName} ${productName} ₹${product.denomination}`;

  const [orderItem] = await db
    .insert(orderItems)
    .values({
      orderId: order.id,
      giftProductId: product.id,
      itemType: "GIFT_CODE",
      title,
      denomination: product.denomination,
      quantity,
      price: product.sellingPrice,
    })
    .returning();

  // Create individual delivery records for each purchased code unit
  const deliveriesToInsert = Array.from({ length: quantity }, () => ({
    orderId: order.id,
    orderItemId: orderItem.id,
    recipientEmail,
    status: "PENDING" as const,
  }));

  await db.insert(giftCodeDeliveries).values(deliveriesToInsert);

  // Create payment record
  const razorpayConfigured = !!process.env.RAZORPAY_KEY_ID && !!process.env.RAZORPAY_KEY_SECRET;
  await db.insert(payments).values({
    orderId: order.id,
    userId: user.id,
    provider: razorpayConfigured && total > 0 ? "RAZORPAY" : "TEST",
    amount: total,
    status: "CREATED",
  });

  revalidatePath("/my-gift-codes");
  redirect(`/pay/${order.id}`);
}

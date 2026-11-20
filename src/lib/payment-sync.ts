import "server-only";

import { db } from "@/db";
import { orders, payments } from "@/db/schema";
import { and, desc, eq, or, sql } from "drizzle-orm";
import { fulfillOrder } from "@/lib/helpers";

export interface SyncPaymentResult {
  synced: boolean;
  paid: boolean;
  status: string;
  orderId?: number;
  orderNumber?: string;
  paymentId?: string;
  error?: string;
}

/**
 * Checks Razorpay REST API directly for any captured payments on an order.
 * If Razorpay confirms payment is captured or authorized, automatically fulfills the order
 * (assigns gift codes, decrypts, marks order PAID, sends email notification).
 * Safe and idempotent: can be called multiple times without duplicate fulfillment.
 */
export async function syncOrderPaymentWithRazorpay(
  orderIdentifier: number | string
): Promise<SyncPaymentResult> {
  try {
    const cleanParam = String(orderIdentifier || "").trim();
    const noHyphenParam = cleanParam.replace(/-/g, "");
    const numId = Number(cleanParam);
    const isNumeric = !isNaN(numId) && String(numId) === cleanParam;

    const [order] = await db
      .select()
      .from(orders)
      .where(
        or(
          isNumeric ? eq(orders.id, numId) : sql`false`,
          eq(orders.orderNumber, cleanParam),
          sql`replace(${orders.orderNumber}, '-', '') = ${noHyphenParam}`
        )
      )
      .limit(1);

    if (!order) {
      return { synced: false, paid: false, status: "NOT_FOUND", error: "Order not found" };
    }

    // If order is already paid, return immediately
    if (order.status === "PAID" || order.status === "COMPLETED") {
      return {
        synced: true,
        paid: true,
        status: order.status,
        orderId: order.id,
        orderNumber: order.orderNumber,
      };
    }

    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.orderId, order.id))
      .limit(1);

    if (!payment || !payment.razorpayOrderId) {
      return {
        synced: false,
        paid: false,
        status: order.status,
        orderId: order.id,
        orderNumber: order.orderNumber,
        error: "No Razorpay order initiated for this order yet.",
      };
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return {
        synced: false,
        paid: false,
        status: order.status,
        orderId: order.id,
        orderNumber: order.orderNumber,
        error: "Razorpay credentials not configured.",
      };
    }

    // Call Razorpay REST API to fetch all payments for this razorpay order
    const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
    const rzpRes = await fetch(
      `https://api.razorpay.com/v1/orders/${payment.razorpayOrderId}/payments`,
      {
        headers: { Authorization: authHeader },
        cache: "no-store",
      }
    );

    if (!rzpRes.ok) {
      const errText = await rzpRes.text().catch(() => "");
      console.warn(`[PaymentSync] Razorpay API error for ${payment.razorpayOrderId}:`, errText);
      return {
        synced: false,
        paid: false,
        status: order.status,
        orderId: order.id,
        orderNumber: order.orderNumber,
        error: "Failed to query Razorpay API.",
      };
    }

    const data = await rzpRes.json();
    const items: Array<{
      id: string;
      status: string;
      amount?: number;
      method?: string;
      captured?: boolean;
    }> = data.items || [];

    // Find any payment that was captured or authorized
    const validPayment = items.find(
      (p) => p.status === "captured" || p.status === "authorized" || p.captured === true
    );

    if (validPayment) {
      console.log(
        `[PaymentSync] Order ${order.orderNumber} confirmed paid via Razorpay payment ${validPayment.id}. Fulfilling order...`
      );

      await fulfillOrder(order.id, {
        razorpayPaymentId: validPayment.id,
        method: validPayment.method || "razorpay",
        provider: "RAZORPAY",
      });

      return {
        synced: true,
        paid: true,
        status: "PAID",
        orderId: order.id,
        orderNumber: order.orderNumber,
        paymentId: validPayment.id,
      };
    }

    return {
      synced: true,
      paid: false,
      status: order.status,
      orderId: order.id,
      orderNumber: order.orderNumber,
    };
  } catch (err: any) {
    console.error("[PaymentSync Error]:", err);
    return {
      synced: false,
      paid: false,
      status: "ERROR",
      error: err.message || "Failed to sync payment status",
    };
  }
}

/**
 * Auto-syncs any recent pending orders for a user (e.g. within the last 24 hours).
 */
export async function syncUserRecentPendingOrders(userId: number, limit = 5): Promise<number> {
  try {
    const pendingOrders = await db
      .select({ id: orders.id })
      .from(orders)
      .where(
        and(
          eq(orders.userId, userId),
          eq(orders.status, "PENDING")
        )
      )
      .orderBy(desc(orders.createdAt))
      .limit(limit);

    let fulfilledCount = 0;
    for (const po of pendingOrders) {
      const res = await syncOrderPaymentWithRazorpay(po.id).catch(() => null);
      if (res?.paid) {
        fulfilledCount++;
      }
    }
    return fulfilledCount;
  } catch (err) {
    console.warn("[PaymentSync] Error checking user pending orders:", err);
    return 0;
  }
}

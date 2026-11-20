import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/db";
import { payments, orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { fulfillOrder } from "@/lib/helpers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) return NextResponse.json({ error: "Razorpay not configured on Website 1." }, { status: 503 });

    const body = await req.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, transactionId, amountPaise, callbackUrl } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: "Missing payment fields" }, { status: 400 });
    }

    // 1. Verify Razorpay cryptographic signature
    const expected = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expected !== razorpay_signature) {
      return NextResponse.json({ error: "Payment signature verification failed" }, { status: 400 });
    }

    // 2. If this is a Bridge transaction from Website 2
    if (transactionId || callbackUrl) {
      const bridgeSecret = process.env.BRIDGE_SHARED_SECRET || "";
      const targetCallbackUrl = callbackUrl || process.env.WEBSITE2_CALLBACK_URL;

      if (!targetCallbackUrl) {
        return NextResponse.json({ error: "Website 2 callback URL not configured." }, { status: 500 });
      }

      const callbackPayload = {
        transactionId: transactionId,
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        status: "SUCCESS",
        amountPaise: Number(amountPaise) || 0,
        currency: "INR",
        timestamp: Date.now(),
      };

      const hmacSignature = crypto
        .createHmac("sha256", bridgeSecret)
        .update(JSON.stringify(callbackPayload))
        .digest("hex");

      try {
        const response = await fetch(targetCallbackUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Bridge-Signature": hmacSignature,
          },
          body: JSON.stringify(callbackPayload),
        });

        const data = await response.json().catch(() => ({}));
        return NextResponse.json({
          success: true,
          ok: true,
          transactionId: transactionId,
          website2Response: data,
        });
      } catch (cbErr: any) {
        console.error("[Bridge Verify Callback Error]:", cbErr);
        return NextResponse.json({
          success: true,
          ok: true,
          warning: "Payment verified on Razorpay, but Website 2 callback network error.",
          error: cbErr.message,
        });
      }
    }

    // 3. Otherwise, internal store order: verify strictly against user & Razorpay API
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.razorpayOrderId, razorpay_order_id))
      .limit(1);
    if (!payment || payment.userId !== user.id) {
      return NextResponse.json({ error: "Payment record not found or unauthorized" }, { status: 404 });
    }

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, payment.orderId))
      .limit(1);

    if (!order || order.userId !== user.id) {
      return NextResponse.json({ error: "Order record not found or unauthorized" }, { status: 404 });
    }

    // 4. Server-Side Direct Verification against Razorpay REST API
    const keyId = process.env.RAZORPAY_KEY_ID;
    if (keyId) {
      const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
      const rzpRes = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, {
        headers: { Authorization: authHeader },
      });

      if (rzpRes.ok) {
        const rzpPayment = await rzpRes.json();
        const expectedPaise = Math.round(order.total * 100);

        if (rzpPayment.order_id !== razorpay_order_id) {
          return NextResponse.json({ error: "Razorpay order ID mismatch" }, { status: 400 });
        }
        if (rzpPayment.amount !== expectedPaise) {
          return NextResponse.json({ error: "Captured payment amount does not match order total" }, { status: 400 });
        }
        if (rzpPayment.status !== "captured" && rzpPayment.status !== "authorized") {
          return NextResponse.json({ error: `Payment not completed (status: ${rzpPayment.status})` }, { status: 400 });
        }
      }
    }

    await fulfillOrder(payment.orderId, {
      razorpayPaymentId: razorpay_payment_id,
      method: "razorpay",
    });

    return NextResponse.json({
      ok: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      isGiftCode: order.orderType === "GIFT_CODE",
    });
  } catch (err: any) {
    console.error("[Payment Verify Route Error]:", err);
    return NextResponse.json({ error: err.message || "Internal server error." }, { status: 500 });
  }
}

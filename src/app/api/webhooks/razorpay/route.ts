import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { fulfillOrder } from "@/lib/helpers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });

    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature") ?? "";
    const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    if (
      signature.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
    ) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const entity = event?.payload?.payment?.entity;
    const orderEntity = event?.payload?.order?.entity;
    const notes = entity?.notes || orderEntity?.notes || {};

    // Check if this is a Bridge payment from Website 2
    if (notes.transactionId || (entity?.description && entity.description.includes("TXN-"))) {
      const transactionId = notes.transactionId || entity?.description || "";
      const bridgeSecret = process.env.BRIDGE_SHARED_SECRET || "";
      const callbackUrl = notes.callbackUrl || process.env.WEBSITE2_CALLBACK_URL;

      if (callbackUrl) {
        const isSuccess = event.event === "payment.captured" || event.event === "order.paid";
        const payload = {
          transactionId: transactionId,
          razorpayOrderId: entity?.order_id || orderEntity?.id,
          razorpayPaymentId: entity?.id,
          status: isSuccess ? "SUCCESS" : "FAILED",
          amountPaise: entity?.amount || 0,
          currency: entity?.currency || "INR",
          timestamp: Date.now(),
        };

        const hmacSignature = crypto
          .createHmac("sha256", bridgeSecret)
          .update(JSON.stringify(payload))
          .digest("hex");

        try {
          await fetch(callbackUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Bridge-Signature": hmacSignature,
            },
            body: JSON.stringify(payload),
          });
        } catch (err) {
          console.error("[Bridge Webhook Callback Error]:", err);
        }
      }
      return NextResponse.json({ ok: true, bridge: true });
    }

    // Internal Digimart store order logic (preserved 100%)
    if (event.event === "payment.captured" && entity?.order_id) {
      const [payment] = await db
        .select()
        .from(payments)
        .where(eq(payments.razorpayOrderId, entity.order_id))
        .limit(1);
      if (payment) {
        await fulfillOrder(payment.orderId, {
          razorpayPaymentId: entity.id,
          method: entity.method ?? "razorpay",
        });
      }
    } else if (event.event === "payment.failed" && entity?.order_id) {
      const [payment] = await db
        .select()
        .from(payments)
        .where(eq(payments.razorpayOrderId, entity.order_id))
        .limit(1);
      if (payment && payment.status === "CREATED") {
        await db
          .update(payments)
          .set({ status: "FAILED", updatedAt: new Date() })
          .where(eq(payments.id, payment.id));
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[Razorpay Webhook Error]:", err);
    return NextResponse.json({ error: err.message || "Webhook processing error" }, { status: 500 });
  }
}

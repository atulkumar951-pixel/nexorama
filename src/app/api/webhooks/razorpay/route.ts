import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { fulfillOrder } from "@/lib/helpers";

export async function POST(req: NextRequest) {
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

  if (event.event === "payment.captured" && entity?.order_id) {
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.razorpayOrderId, entity.order_id))
      .limit(1);
    if (payment) {
      // fulfillOrder is idempotent — duplicate webhooks are safe
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
}

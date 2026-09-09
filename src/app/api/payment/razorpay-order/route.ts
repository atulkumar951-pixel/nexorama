import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, payments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return NextResponse.json({ error: "Razorpay is not configured." }, { status: 503 });
  }

  const { orderId } = await req.json();
  const [order] = await db.select().from(orders).where(eq(orders.id, Number(orderId))).limit(1);
  if (!order || order.userId !== user.id) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status !== "PENDING") return NextResponse.json({ error: "Order is not payable" }, { status: 400 });

  // Server-side amount — never trust the client
  const amountPaise = order.total * 100;

  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency: "INR",
      receipt: order.orderNumber,
      notes: { orderId: String(order.id) },
    }),
  });
  if (!res.ok) {
    return NextResponse.json({ error: "Failed to create Razorpay order" }, { status: 502 });
  }
  const rzpOrder = await res.json();

  await db
    .update(payments)
    .set({ razorpayOrderId: rzpOrder.id, provider: "RAZORPAY", updatedAt: new Date() })
    .where(eq(payments.orderId, order.id));

  return NextResponse.json({
    keyId,
    razorpayOrderId: rzpOrder.id,
    amount: amountPaise,
    currency: "INR",
    name: "Nexora",
    description: order.orderNumber,
    prefill: { name: user.name, email: user.email },
  });
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, payments } from "@/db/schema";
import { eq, or, sql } from "drizzle-orm";
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
  if (!orderId) return NextResponse.json({ error: "Missing order identifier." }, { status: 400 });

  const cleanParam = String(orderId).trim();
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

  if (!order || order.userId !== user.id) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status !== "PENDING") return NextResponse.json({ error: "Order is not payable" }, { status: 400 });

  // Server-side amount strictly from database — never trust the client
  const amountPaise = Math.round(order.total * 100);
  if (amountPaise <= 0) {
    return NextResponse.json({ error: "Invalid payable amount" }, { status: 400 });
  }

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
      notes: {
        orderId: String(order.id),
        orderNumber: order.orderNumber,
        userId: String(user.id),
      },
    }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    return NextResponse.json(
      { error: errData.error?.description || "Failed to create Razorpay order" },
      { status: 502 }
    );
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

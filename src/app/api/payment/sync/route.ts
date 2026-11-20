import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { syncOrderPaymentWithRazorpay } from "@/lib/payment-sync";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq, or, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { orderId } = body;
    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    const cleanParam = String(orderId || "").trim();
    const noHyphenParam = cleanParam.replace(/-/g, "");
    const numId = Number(cleanParam);
    const isNumeric = !isNaN(numId) && String(numId) === cleanParam;

    const [order] = await db
      .select({ id: orders.id, userId: orders.userId, orderNumber: orders.orderNumber, status: orders.status })
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
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Optional user verification (if logged in, ensure ownership; if not logged in or session expired, allow sync since it only fulfills into DB without leaking codes)
    const user = await getCurrentUser();
    if (user && order.userId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const result = await syncOrderPaymentWithRazorpay(order.id);

    return NextResponse.json({
      ok: true,
      paid: result.paid,
      status: result.status,
      orderNumber: result.orderNumber || order.orderNumber,
      orderId: result.orderId || order.id,
      paymentId: result.paymentId,
    });
  } catch (err: any) {
    console.error("[Payment Sync API Error]:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

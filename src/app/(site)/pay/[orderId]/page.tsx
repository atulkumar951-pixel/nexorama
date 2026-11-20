import { redirect } from "next/navigation";
import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";
import { eq, or, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { formatINR, formatOrderNumber } from "@/lib/format";
import { testPayAction } from "@/lib/actions/shop-actions";
import { SubmitButton } from "@/components/client";
import RazorpayButton from "./razorpay-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Complete Payment" };

export default async function PayPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/pay/${orderId}`);

  const cleanParam = (orderId || "").trim();
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

  if (!order || order.userId !== user.id) redirect("/orders");

  const cleanOrderNumber = formatOrderNumber(order.orderNumber);

  // Canonicalize URL: prevent enumeration and tampering with sequential IDs
  if (cleanParam !== cleanOrderNumber) {
    redirect(`/pay/${cleanOrderNumber}`);
  }

  if (order.status !== "PENDING") redirect(`/orders/${cleanOrderNumber}`);

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  const razorpayConfigured = !!process.env.RAZORPAY_KEY_ID && !!process.env.RAZORPAY_KEY_SECRET;

  return (
    <div className="mx-auto max-w-lg px-4 py-14">
      <div className="card p-8">
        <p className="text-sm font-semibold font-mono text-indigo-600">{cleanOrderNumber}</p>
        <h1 className="mt-1 text-2xl font-bold">Complete your payment</h1>
        <ul className="mt-5 divide-y divide-slate-100 text-sm">
          {items.map((i) => (
            <li key={i.id} className="flex justify-between py-2">
              <span>{i.title}</span>
              <span className="font-semibold">{formatINR(i.price)}</span>
            </li>
          ))}
          {order.couponDiscount > 0 && (
            <li className="flex justify-between py-2 text-emerald-600">
              <span>Coupon ({order.couponCode})</span>
              <span>−{formatINR(order.couponDiscount)}</span>
            </li>
          )}
        </ul>
        <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 text-lg font-extrabold">
          <span>Total</span>
          <span>{formatINR(order.total)}</span>
        </div>

        <div className="mt-6 space-y-3">
          {razorpayConfigured ? (
            <RazorpayButton orderIdentifier={cleanOrderNumber} />
          ) : (
            <>
              <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
                <strong>Test mode:</strong> Razorpay keys are not configured (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET).
                Use the simulator below — access is still granted only after server-side verification.
              </div>
              <form action={testPayAction.bind(null, cleanOrderNumber, "success")}>
                <SubmitButton className="btn-primary w-full !py-3" pendingText="Processing payment…">
                  ✓ Simulate Successful Payment · {formatINR(order.total)}
                </SubmitButton>
              </form>
              <form action={testPayAction.bind(null, cleanOrderNumber, "fail")}>
                <SubmitButton className="btn-secondary w-full !text-red-600" pendingText="Processing…">
                  ✕ Simulate Failed Payment
                </SubmitButton>
              </form>
            </>
          )}
        </div>
        <p className="mt-4 text-center text-xs text-slate-400">🔒 The server verifies every payment before granting access.</p>
      </div>
    </div>
  );
}

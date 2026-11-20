import { redirect } from "next/navigation";
import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";
import { eq, or, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { formatINR, formatOrderNumber } from "@/lib/format";
import { simulatePayAction } from "@/lib/actions/shop-actions";
import { SubmitButton } from "@/components/client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Complete Payment | Nexora" };

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

  return (
    <div className="mx-auto max-w-lg px-4 py-14">
      <div className="card p-8 shadow-xl shadow-slate-200/50 border border-slate-200 rounded-3xl bg-white">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1">
            {cleanOrderNumber}
          </p>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Instant Simulated Checkout
          </span>
        </div>

        <h1 className="mt-3 text-2xl font-black text-slate-900">Complete Your Payment</h1>
        <p className="text-xs text-slate-500 mt-1">
          Click below to complete simulated payment and instantly reveal your digital voucher code.
        </p>

        <ul className="mt-6 divide-y divide-slate-100 text-sm">
          {items.map((i) => {
            const cleanTitle = i.title.replace(/^([A-Za-z0-9]+)\s+\1\b/i, "$1");
            return (
              <li key={i.id} className="flex justify-between py-2.5">
                <span className="font-medium text-slate-700">{cleanTitle}</span>
                <span className="font-bold text-slate-900">{formatINR(i.price)}</span>
              </li>
            );
          })}
          {order.couponDiscount > 0 && (
            <li className="flex justify-between py-2 text-emerald-600">
              <span>Coupon ({order.couponCode})</span>
              <span>−{formatINR(order.couponDiscount)}</span>
            </li>
          )}
        </ul>

        <div className="mt-4 flex justify-between border-t border-slate-200 pt-4 text-lg font-black text-slate-900">
          <span>Total Payable</span>
          <span className="text-emerald-700">{formatINR(order.total)}</span>
        </div>

        <div className="mt-6 space-y-3">
          <form action={simulatePayAction.bind(null, cleanOrderNumber)}>
            <SubmitButton
              className="btn-primary w-full !py-3.5 text-base font-bold shadow-lg shadow-emerald-200 hover:shadow-emerald-300 transition flex items-center justify-center gap-2"
              pendingText="⚡ Completing payment & releasing voucher code…"
            >
              <span>⚡ Pay Now · {formatINR(order.total)}</span>
            </SubmitButton>
          </form>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-center text-xs text-emerald-800 space-y-1">
            <div className="flex items-center justify-center gap-1.5 font-bold text-emerald-900">
              <span>⚡</span>
              <span>Simulated Instant Payment</span>
            </div>
            <p className="text-[11px] text-emerald-700 leading-relaxed">
              No gateway or UPI app required. Clicking <strong>Pay Now</strong> instantly verifies payment, allocates your voucher code from inventory, and delivers it to your screen &amp; email.
            </p>
          </div>
        </div>

        <p className="mt-5 text-center text-[11px] text-slate-400">
          🔒 Nexora Instant Digital Voucher Delivery SLA · 100% Genuine Brand Codes
        </p>
      </div>
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { orderItems, orders, payments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { formatDate, formatINR, statusBadgeClass } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Order Details" };

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ success?: string; failed?: string }>;
}) {
  const { orderId } = await params;
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/orders");

  const [order] = await db.select().from(orders).where(eq(orders.id, Number(orderId))).limit(1);
  if (!order || order.userId !== user.id) redirect("/orders");

  const [items, [payment]] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, order.id)),
    db.select().from(payments).where(eq(payments.orderId, order.id)).limit(1),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {sp.success && (
        order.orderType === "GIFT_CODE" ? (
          <div className="mb-6 rounded-xl bg-emerald-50 p-5 text-emerald-800 ring-1 ring-emerald-200">
            <p className="text-lg font-bold">🎉 Payment successful!</p>
            <p className="text-sm">Your payment is confirmed and your gift code is ready in My Gift Codes.</p>
            <Link href="/my-gift-codes" className="btn-primary mt-3 !bg-emerald-600 hover:!bg-emerald-700">View My Gift Codes →</Link>
          </div>
        ) : (
          <div className="mb-6 rounded-xl bg-emerald-50 p-5 text-emerald-800 ring-1 ring-emerald-200">
            <p className="text-lg font-bold">🎉 Payment successful!</p>
            <p className="text-sm">Your products have been added to your library.</p>
            <Link href="/library" className="btn-primary mt-3 !bg-emerald-600 hover:!bg-emerald-700">Go to My Library →</Link>
          </div>
        )
      )}
      {sp.failed && (
        <div className="mb-6 rounded-xl bg-red-50 p-5 text-red-700 ring-1 ring-red-200">
          <p className="text-lg font-bold">Payment failed</p>
          <p className="text-sm">No money was captured. You can retry the payment below.</p>
          {order.status === "PENDING" && <Link href={`/pay/${order.id}`} className="btn-primary mt-3 !bg-red-600 hover:!bg-red-700">Retry Payment</Link>}
        </div>
      )}

      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{order.orderNumber}</h1>
            <p className="text-sm text-slate-500">Placed {formatDate(order.createdAt)}</p>
          </div>
          <span className={`badge ${statusBadgeClass(order.status)} !px-3 !py-1 !text-sm`}>{order.status}</span>
        </div>

        <ul className="mt-6 divide-y divide-slate-100 text-sm">
          {items.map((i) => (
            <li key={i.id} className="flex justify-between py-2.5">
              <span>{i.title}</span>
              <span className="font-semibold">{formatINR(i.price)}</span>
            </li>
          ))}
        </ul>

        <dl className="mt-4 space-y-1.5 border-t border-slate-200 pt-4 text-sm">
          <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd>{formatINR(order.subtotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Sale discount</dt><dd className="text-emerald-600">−{formatINR(order.discount)}</dd></div>
          {order.couponDiscount > 0 && (
            <div className="flex justify-between"><dt className="text-slate-500">Coupon ({order.couponCode})</dt><dd className="text-emerald-600">−{formatINR(order.couponDiscount)}</dd></div>
          )}
          <div className="flex justify-between pt-1 text-lg font-extrabold"><dt>Total</dt><dd>{formatINR(order.total)}</dd></div>
        </dl>

        {payment && (
          <div className="mt-6 rounded-lg bg-slate-50 p-4 text-sm">
            <p className="font-semibold">Payment details</p>
            <div className="mt-2 grid gap-1 text-xs text-slate-600 sm:grid-cols-2">
              <p>Provider: {payment.provider}</p>
              <p>Status: <span className={`badge ${statusBadgeClass(payment.status)}`}>{payment.status}</span></p>
              {payment.razorpayPaymentId && <p>Payment ID: {payment.razorpayPaymentId}</p>}
              {payment.method && <p>Method: {payment.method}</p>}
            </div>
          </div>
        )}

        {order.status === "PENDING" && (
          <Link href={`/pay/${order.id}`} className="btn-primary mt-6 w-full !py-3">Complete Payment →</Link>
        )}
        {(order.status === "PAID" || order.status === "COMPLETED") && (
          order.orderType === "GIFT_CODE" ? (
            <Link href="/my-gift-codes" className="btn-primary mt-6 w-full !bg-emerald-600 hover:!bg-emerald-700 !py-3">
              ⚡ View &amp; Redeem My Gift Codes →
            </Link>
          ) : (
            <Link href="/library" className="btn-primary mt-6 w-full !py-3">Open My Library →</Link>
          )
        )}
      </div>
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { orderItems, orders, payments, giftCodeDeliveries, giftCodes } from "@/db/schema";
import { eq, or, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { formatDate, formatINR, formatOrderNumber, statusBadgeClass } from "@/lib/format";
import { decryptGiftCode } from "@/lib/gift-crypto";
import { CodeDisplay } from "@/app/(site)/my-gift-codes/code-display";
import { syncOrderPaymentWithRazorpay } from "@/lib/payment-sync";
import { simulatePayAction } from "@/lib/actions/shop-actions";
import { SubmitButton } from "@/components/client";
import { PendingSyncChecker } from "./pending-sync-checker";

export const dynamic = "force-dynamic";
export const metadata = { title: "Order Details" };

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams?: Promise<{ success?: string; failed?: string }>;
}) {
  const { orderId } = await params;
  const sp = searchParams ? await searchParams : {};
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/orders/${orderId}`);

  const cleanParam = (orderId || "").trim();
  const noHyphenParam = cleanParam.replace(/-/g, "");
  const numId = Number(cleanParam);
  const isNumeric = !isNaN(numId) && String(numId) === cleanParam;

  let [order] = await db
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
    const qs = new URLSearchParams(sp as Record<string, string>).toString();
    redirect(`/orders/${cleanOrderNumber}${qs ? `?${qs}` : ""}`);
  }

  // Direct server-side sync with Razorpay REST API
  // If payment was completed via UPI or mobile tab switch, this fulfills the order immediately
  if (order.status === "PENDING") {
    const syncRes = await syncOrderPaymentWithRazorpay(order.id).catch(() => null);
    if (syncRes?.paid) {
      const [refreshed] = await db.select().from(orders).where(eq(orders.id, order.id)).limit(1);
      if (refreshed) order = refreshed;
    }
  }

  const isOrderPaid = order.status === "PAID" || order.status === "COMPLETED";

  const [items, [payment], giftDeliveries] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, order.id)),
    db.select().from(payments).where(eq(payments.orderId, order.id)).limit(1),
    order.orderType === "GIFT_CODE" && isOrderPaid
      ? db
          .select({
            id: giftCodeDeliveries.id,
            recipientEmail: giftCodeDeliveries.recipientEmail,
            status: giftCodeDeliveries.status,
            maskedCode: giftCodes.maskedCode,
            encryptedCode: giftCodes.encryptedCode,
          })
          .from(giftCodeDeliveries)
          .leftJoin(giftCodes, eq(giftCodeDeliveries.giftCodeId, giftCodes.id))
          .where(eq(giftCodeDeliveries.orderId, order.id))
      : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {(sp.success || isOrderPaid) && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 ring-1 ring-emerald-200 flex items-center gap-2">
          <span>🎉</span>
          <span className="font-semibold text-sm">Payment successful! Your voucher code is ready below.</span>
        </div>
      )}
      {sp.failed && !isOrderPaid && (
        <div className="mb-6 rounded-xl bg-red-50 p-5 text-red-700 ring-1 ring-red-200">
          <p className="text-lg font-bold">Payment failed</p>
          <p className="text-sm">No money was captured. You can retry the payment below.</p>
          {order.status === "PENDING" && (
            <Link href={`/pay/${cleanOrderNumber}`} className="btn-primary mt-3 !bg-red-600 hover:!bg-red-700">
              Retry Payment
            </Link>
          )}
        </div>
      )}

      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold font-mono tracking-tight">{cleanOrderNumber}</h1>
            <p className="text-sm text-slate-500">Placed {formatDate(order.createdAt)}</p>
          </div>
          <span className={`badge ${statusBadgeClass(order.status)} !px-3 !py-1 !text-sm`}>{order.status}</span>
        </div>

        {order.status === "PENDING" && (
          <PendingSyncChecker orderIdentifier={cleanOrderNumber} />
        )}

        <ul className="mt-6 divide-y divide-slate-100 text-sm">
          {items.map((i) => {
            const cleanTitle = i.title.replace(/^([A-Za-z0-9]+)\s+\1\b/i, "$1");
            return (
              <li key={i.id} className="flex justify-between py-2.5">
                <span>{cleanTitle}</span>
                <span className="font-semibold">{formatINR(i.price)}</span>
              </li>
            );
          })}
        </ul>

        {/* Voucher Code Details right on this page with partial blur reveal */}
        {giftDeliveries.length > 0 && (
          <div className="mt-6 border-t border-slate-200 pt-5">
            <h2 className="text-sm font-bold text-slate-800 mb-1">Your Purchased Voucher Code</h2>
            <p className="text-xs text-slate-500 mb-2">Click below to reveal or copy your voucher code.</p>
            {giftDeliveries.map((d) => {
              const rawCode = d.encryptedCode ? decryptGiftCode(d.encryptedCode) : null;
              return (
                <CodeDisplay
                  key={d.id}
                  rawCode={rawCode}
                  maskedCode={d.maskedCode}
                  recipientEmail={d.recipientEmail}
                  orderNumber={cleanOrderNumber}
                  productName={items[0]?.title}
                  denomination={items[0]?.denomination ?? undefined}
                />
              );
            })}
          </div>
        )}

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
          <div className="mt-6 flex flex-col gap-2">
            <form action={simulatePayAction.bind(null, cleanOrderNumber)}>
              <SubmitButton
                className="btn-primary w-full !py-3.5 text-center font-bold shadow-md shadow-emerald-200 flex items-center justify-center gap-2"
                pendingText="⚡ Completing payment & unlocking code…"
              >
                <span>⚡ Pay Now &amp; Unlock Code ({formatINR(order.total)})</span>
              </SubmitButton>
            </form>
            <Link
              href={`/pay/${cleanOrderNumber}`}
              className="btn-secondary w-full !py-2.5 text-center text-xs text-slate-600 hover:text-slate-900"
            >
              Open Dedicated Payment Page →
            </Link>
          </div>
        )}
        {isOrderPaid && (
          order.orderType === "GIFT_CODE" ? (
            <Link href="/my-gift-codes" className="btn-secondary mt-6 w-full !py-3 text-center font-bold">
              ← View All My Bought Codes
            </Link>
          ) : (
            <Link href="/library" className="btn-primary mt-6 w-full !py-3">Open My Library →</Link>
          )
        )}
      </div>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { accessGrants, orderItems, orders, payments, refunds, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { formatDate, formatINR, statusBadgeClass } from "@/lib/format";
import ActionForm from "@/components/ActionForm";
import { refundOrderAction } from "@/lib/actions/admin-actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Order Details" };

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [row] = await db
    .select({ order: orders, userName: users.name, userEmail: users.email, userId: users.id })
    .from(orders)
    .innerJoin(users, eq(orders.userId, users.id))
    .where(eq(orders.id, Number(id)))
    .limit(1);
  if (!row) notFound();
  const { order } = row;

  const [items, paymentRows, refundRows, grants] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, order.id)),
    db.select().from(payments).where(eq(payments.orderId, order.id)),
    db.select().from(refunds).where(eq(refunds.orderId, order.id)),
    db.select().from(accessGrants).where(eq(accessGrants.orderId, order.id)),
  ]);

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/nexora/orders" className="text-sm text-slate-500 hover:text-indigo-600">← All orders</Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{order.orderNumber}</h1>
        <span className={`badge ${statusBadgeClass(order.status)} !px-3 !py-1`}>{order.status}</span>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Customer: <Link href={`/nexora/users/${row.userId}`} className="font-semibold text-indigo-600 hover:underline">{row.userName}</Link> ({row.userEmail}) · {formatDate(order.createdAt)}
      </p>

      <div className="card mt-6 p-6">
        <h2 className="font-bold">Items</h2>
        <ul className="mt-3 divide-y divide-slate-100 text-sm">
          {items.map((i) => (
            <li key={i.id} className="flex justify-between py-2">
              <span>{i.title}</span>
              <span className="font-semibold">{formatINR(i.price)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 space-y-1 border-t border-slate-200 pt-3 text-sm">
          <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd>{formatINR(order.subtotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Discounts</dt><dd>−{formatINR(order.discount + order.couponDiscount)}{order.couponCode ? ` (${order.couponCode})` : ""}</dd></div>
          <div className="flex justify-between text-base font-bold"><dt>Total</dt><dd>{formatINR(order.total)}</dd></div>
        </dl>
      </div>

      <div className="card mt-6 p-6">
        <h2 className="font-bold">Payments</h2>
        <ul className="mt-3 divide-y divide-slate-100 text-sm">
          {paymentRows.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <div>
                <p className="font-medium">{p.provider} · {formatINR(p.amount)}</p>
                <p className="text-xs text-slate-500">
                  {p.razorpayOrderId && `rzp order: ${p.razorpayOrderId} · `}
                  {p.razorpayPaymentId && `payment: ${p.razorpayPaymentId} · `}
                  {p.method ?? ""}
                </p>
              </div>
              <span className={`badge ${statusBadgeClass(p.status)}`}>{p.status}</span>
            </li>
          ))}
        </ul>
      </div>

      {grants.length > 0 && (
        <div className="card mt-6 p-6">
          <h2 className="font-bold">Access grants</h2>
          <ul className="mt-3 divide-y divide-slate-100 text-sm">
            {grants.map((g) => (
              <li key={g.id} className="flex justify-between py-2">
                <span>Product #{g.productId} · granted {formatDate(g.grantedAt)}</span>
                <span className={`badge ${statusBadgeClass(g.status)}`}>{g.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {refundRows.length > 0 && (
        <div className="card mt-6 p-6">
          <h2 className="font-bold">Refunds</h2>
          <ul className="mt-3 divide-y divide-slate-100 text-sm">
            {refundRows.map((r) => (
              <li key={r.id} className="py-2">
                <p className="font-medium">{formatINR(r.amount)} · {formatDate(r.createdAt)}</p>
                <p className="text-xs text-slate-500">{r.reason} · access {r.revokeAccess ? "revoked" : "kept"}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(order.status === "PAID" || order.status === "COMPLETED") && (
        <div className="card mt-6 border-red-200 p-6">
          <h2 className="font-bold text-red-700">Process refund</h2>
          <p className="mt-1 text-xs text-slate-500">Refunds the full amount ({formatINR(order.total)}), updates payment records and (optionally) revokes access. This action is audited.</p>
          <div className="mt-4">
            <ActionForm action={refundOrderAction} submitLabel="Process refund">
              <input type="hidden" name="orderId" value={order.id} />
              <div>
                <label className="label">Reason</label>
                <input name="reason" className="input" placeholder="Customer request" />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="keepAccess" className="h-4 w-4 rounded" /> Let the customer keep access (default revokes)
              </label>
            </ActionForm>
          </div>
        </div>
      )}
    </div>
  );
}

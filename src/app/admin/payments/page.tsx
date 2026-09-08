import Link from "next/link";
import { db } from "@/db";
import { orders, payments, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { formatDate, formatINR, statusBadgeClass } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Payments" };

export default async function AdminPaymentsPage() {
  const rows = await db
    .select({ payment: payments, orderNumber: orders.orderNumber, orderId: orders.id, userEmail: users.email })
    .from(payments)
    .innerJoin(orders, eq(payments.orderId, orders.id))
    .innerJoin(users, eq(payments.userId, users.id))
    .orderBy(desc(payments.createdAt))
    .limit(100);

  return (
    <div>
      <h1 className="text-2xl font-bold">Payments</h1>
      <div className="card mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Provider</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(({ payment: p, orderNumber, orderId, userEmail }) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <p className="font-medium">#{p.id}</p>
                  <p className="text-xs text-slate-500">{p.razorpayPaymentId ?? "—"}</p>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/admin/orders/${orderId}`} className="font-semibold text-indigo-600 hover:underline">{orderNumber}</Link>
                </td>
                <td className="px-4 py-3 text-slate-500">{userEmail}</td>
                <td className="px-4 py-3 font-semibold">{formatINR(p.amount)}</td>
                <td className="px-4 py-3">{p.provider}</td>
                <td className="px-4 py-3"><span className={`badge ${statusBadgeClass(p.status)}`}>{p.status}</span></td>
                <td className="px-4 py-3 text-slate-500">{formatDate(p.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-8 text-center text-slate-400">No payments yet.</p>}
      </div>
    </div>
  );
}

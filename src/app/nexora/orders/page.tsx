import Link from "next/link";
import { db } from "@/db";
import { orders, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { formatDate, formatINR, statusBadgeClass } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Orders" };

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const base = db
    .select({ order: orders, userName: users.name, userEmail: users.email })
    .from(orders)
    .innerJoin(users, eq(orders.userId, users.id));
  const rows = sp.status
    ? await base.where(eq(orders.status, sp.status)).orderBy(desc(orders.createdAt)).limit(100)
    : await base.orderBy(desc(orders.createdAt)).limit(100);

  const statuses = ["PENDING", "PAID", "COMPLETED", "CANCELLED", "REFUNDED"];

  return (
    <div>
      <h1 className="text-2xl font-bold">Orders</h1>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/nexora/orders" className={`badge ${!sp.status ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}>All</Link>
        {statuses.map((s) => (
          <Link key={s} href={`/nexora/orders?status=${s}`} className={`badge ${sp.status === s ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}>{s}</Link>
        ))}
      </div>
      <div className="card mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Coupon</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(({ order: o, userName, userEmail }) => (
              <tr key={o.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/nexora/orders/${o.id}`} className="font-semibold text-indigo-600 hover:underline">{o.orderNumber}</Link>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium">{userName}</p>
                  <p className="text-xs text-slate-500">{userEmail}</p>
                </td>
                <td className="px-4 py-3 font-semibold">{formatINR(o.total)}</td>
                <td className="px-4 py-3 text-slate-500">{o.couponCode ?? "—"}</td>
                <td className="px-4 py-3"><span className={`badge ${statusBadgeClass(o.status)}`}>{o.status}</span></td>
                <td className="px-4 py-3 text-slate-500">{formatDate(o.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-8 text-center text-slate-400">No orders found.</p>}
      </div>
    </div>
  );
}

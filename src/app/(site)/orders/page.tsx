import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { formatDate, formatINR, statusBadgeClass } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Orders" };

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/orders");

  const rows = await db.select().from(orders).where(eq(orders.userId, user.id)).orderBy(desc(orders.createdAt)).limit(50);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold">My Orders</h1>
      {rows.length === 0 ? (
        <div className="card mt-8 p-16 text-center">
          <p className="text-5xl">🧾</p>
          <p className="mt-4 font-semibold text-slate-700">No orders yet</p>
          <Link href="/products" className="btn-primary mt-6">Browse Marketplace</Link>
        </div>
      ) : (
        <div className="card mt-8 divide-y divide-slate-100">
          {rows.map((o) => (
            <Link key={o.id} href={`/orders/${o.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-slate-50">
              <div>
                <p className="font-semibold">{o.orderNumber}</p>
                <p className="text-xs text-slate-500">{formatDate(o.createdAt)}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className={`badge ${statusBadgeClass(o.status)}`}>{o.status}</span>
                <span className="font-bold">{formatINR(o.total)}</span>
                <span className="text-slate-400">→</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

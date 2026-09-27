import Link from "next/link";
import { db } from "@/db";
import { downloads, orders, payments, products, refunds, users } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { formatDate, formatINR, statusBadgeClass } from "@/lib/format";

import { redirect } from "next/navigation";
import { getMarketplaceMode } from "@/lib/marketplace-mode";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin Dashboard" };

export default async function AdminDashboard() {
  const mode = await getMarketplaceMode();
  if (mode === "GIFT_CODES") {
    redirect("/nexora/gift-cards");
  }
  let u: { c: number } | undefined;
  let p: { c: number } | undefined;
  let o: { c: number } | undefined;
  let rev: { s: number } | undefined;
  let pay: { c: number } | undefined;
  let ref: { c: number } | undefined;
  let dl: { c: number } | undefined;
  let recentOrders: Array<{ order: any; userName: string }> = [];
  let topProducts: any[] = [];
  let dbError: string | null = null;

  try {
    const [uRes, pRes, oRes, revRes, payRes, refRes, dlRes, ordersRes, productsRes] = await Promise.all([
      db.select({ c: sql<number>`count(*)::int` }).from(users).where(eq(users.role, "user")),
      db.select({ c: sql<number>`count(*)::int` }).from(products),
      db.select({ c: sql<number>`count(*)::int` }).from(orders),
      db.select({ s: sql<number>`coalesce(sum(total),0)::int` }).from(orders).where(sql`status in ('PAID','COMPLETED')`),
      db.select({ c: sql<number>`count(*)::int` }).from(payments).where(eq(payments.status, "CAPTURED")),
      db.select({ c: sql<number>`count(*)::int` }).from(refunds),
      db.select({ c: sql<number>`count(*)::int` }).from(downloads).where(eq(downloads.status, "COMPLETED")),
      db
        .select({ order: orders, userName: users.name })
        .from(orders)
        .innerJoin(users, eq(orders.userId, users.id))
        .orderBy(desc(orders.createdAt))
        .limit(8),
      db.select().from(products).orderBy(desc(products.salesCount)).limit(5),
    ]);
    [u] = uRes;
    [p] = pRes;
    [o] = oRes;
    [rev] = revRes;
    [pay] = payRes;
    [ref] = refRes;
    [dl] = dlRes;
    recentOrders = ordersRes;
    topProducts = productsRes;
  } catch (err: any) {
    console.error("[AdminDashboard DB Error]:", err);
    dbError = err?.message || "Failed to load database stats.";
  }

  const cards = [
    { label: "Total Revenue", value: formatINR(rev?.s ?? 0), icon: "💰", accent: "bg-emerald-500" },
    { label: "Total Orders", value: o?.c ?? 0, icon: "🧾", accent: "bg-indigo-500" },
    { label: "Successful Payments", value: pay?.c ?? 0, icon: "💳", accent: "bg-blue-500" },
    { label: "Customers", value: u?.c ?? 0, icon: "👥", accent: "bg-violet-500" },
    { label: "Products", value: p?.c ?? 0, icon: "📦", accent: "bg-amber-500" },
    { label: "Downloads", value: dl?.c ?? 0, icon: "⬇️", accent: "bg-cyan-500" },
    { label: "Refunds", value: ref?.c ?? 0, icon: "💸", accent: "bg-red-500" },
  ];

  return (
    <div>
      {dbError && (
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-bold">⚠️ Database Notice: {dbError}</p>
          <p className="mt-1 text-xs">
            If you recently deployed new features, you can verify and apply the database schema.
            <Link href="/api/migrate" target="_blank" className="ml-2 font-bold underline hover:text-amber-950">
              Apply Database Migration (/api/migrate) ↗
            </Link>
          </p>
        </div>
      )}
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="card flex items-center gap-3 p-4">
            <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${c.accent} text-lg text-white`}>{c.icon}</span>
            <div>
              <p className="text-xl font-extrabold">{c.value}</p>
              <p className="text-xs text-slate-500">{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="card overflow-x-auto">
          <div className="flex items-center justify-between border-b border-slate-100 p-4">
            <h2 className="font-bold">Recent Orders</h2>
            <Link href="/nexora/orders" className="text-sm font-semibold text-indigo-600 hover:underline">All orders →</Link>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">Order</th>
                <th className="px-4 py-2">Customer</th>
                <th className="px-4 py-2">Amount</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentOrders.map(({ order, userName }) => (
                <tr key={order.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <Link href={`/nexora/orders/${order.id}`} className="font-semibold text-indigo-600 hover:underline">{order.orderNumber}</Link>
                  </td>
                  <td className="px-4 py-2.5">{userName}</td>
                  <td className="px-4 py-2.5 font-semibold">{formatINR(order.total)}</td>
                  <td className="px-4 py-2.5"><span className={`badge ${statusBadgeClass(order.status)}`}>{order.status}</span></td>
                  <td className="px-4 py-2.5 text-slate-500">{formatDate(order.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card p-4">
          <h2 className="mb-3 font-bold">Best Sellers</h2>
          <ul className="divide-y divide-slate-100 text-sm">
            {topProducts.map((tp, i) => (
              <li key={tp.id} className="flex items-center gap-3 py-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">{i + 1}</span>
                <Link href={`/nexora/products/${tp.id}`} className="flex-1 truncate font-medium hover:text-indigo-600">{tp.title}</Link>
                <span className="text-xs text-slate-500">{tp.salesCount} sales</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

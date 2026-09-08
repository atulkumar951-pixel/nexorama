import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { accessGrants, downloads, orders, products, wishlistItems } from "@/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { formatDate, formatINR, statusBadgeClass } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");

  const [[libCount], [orderCount], [dlCount], [wishCount], recentOrders, recentLibrary] = await Promise.all([
    db.select({ c: sql<number>`count(*)::int` }).from(accessGrants).where(and(eq(accessGrants.userId, user.id), eq(accessGrants.status, "ACTIVE"))),
    db.select({ c: sql<number>`count(*)::int` }).from(orders).where(eq(orders.userId, user.id)),
    db.select({ c: sql<number>`count(*)::int` }).from(downloads).where(and(eq(downloads.userId, user.id), eq(downloads.status, "COMPLETED"))),
    db.select({ c: sql<number>`count(*)::int` }).from(wishlistItems).where(eq(wishlistItems.userId, user.id)),
    db.select().from(orders).where(eq(orders.userId, user.id)).orderBy(desc(orders.createdAt)).limit(5),
    db
      .select({ grant: accessGrants, product: products })
      .from(accessGrants)
      .innerJoin(products, eq(accessGrants.productId, products.id))
      .where(and(eq(accessGrants.userId, user.id), eq(accessGrants.status, "ACTIVE")))
      .orderBy(desc(accessGrants.grantedAt))
      .limit(4),
  ]);

  const stats = [
    { label: "Library items", value: libCount?.c ?? 0, href: "/library", icon: "📚" },
    { label: "Orders", value: orderCount?.c ?? 0, href: "/orders", icon: "🧾" },
    { label: "Downloads", value: dlCount?.c ?? 0, href: "/library", icon: "⬇️" },
    { label: "Wishlist", value: wishCount?.c ?? 0, href: "/wishlist", icon: "♡" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-bold">Hi, {user.name.split(" ")[0]} 👋</h1>
      <p className="mt-1 text-slate-500">Here&apos;s an overview of your account.</p>

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card p-5 transition hover:shadow-md">
            <p className="text-2xl">{s.icon}</p>
            <p className="mt-2 text-3xl font-extrabold">{s.value}</p>
            <p className="text-sm text-slate-500">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold">Recent Orders</h2>
            <Link href="/orders" className="text-sm font-semibold text-indigo-600 hover:underline">View all</Link>
          </div>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-slate-500">No orders yet. <Link href="/products" className="text-indigo-600 hover:underline">Start shopping →</Link></p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {recentOrders.map((o) => (
                <li key={o.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <Link href={`/orders/${o.id}`} className="font-semibold hover:text-indigo-600">{o.orderNumber}</Link>
                    <p className="text-xs text-slate-500">{formatDate(o.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatINR(o.total)}</p>
                    <span className={`badge ${statusBadgeClass(o.status)}`}>{o.status}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold">Continue Learning</h2>
            <Link href="/library" className="text-sm font-semibold text-indigo-600 hover:underline">My Library</Link>
          </div>
          {recentLibrary.length === 0 ? (
            <p className="text-sm text-slate-500">Your library is empty.</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {recentLibrary.map(({ grant, product }) => (
                <li key={grant.id} className="flex items-center justify-between py-2.5">
                  <Link href={`/library/${product.id}`} className="font-semibold hover:text-indigo-600">{product.title}</Link>
                  <span className="text-xs text-slate-500">{grant.expiresAt ? `Expires ${formatDate(grant.expiresAt)}` : "Lifetime"}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

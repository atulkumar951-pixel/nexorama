import Link from "next/link";
import { db } from "@/db";
import { orders, users } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { formatDate, formatINR, statusBadgeClass } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Users" };

export default async function AdminUsersPage() {
  const rows = await db
    .select({
      user: users,
      orderCount: sql<number>`count(${orders.id})::int`,
      spent: sql<number>`coalesce(sum(${orders.total}) filter (where ${orders.status} in ('PAID','COMPLETED')),0)::int`,
    })
    .from(users)
    .leftJoin(orders, eq(orders.userId, users.id))
    .groupBy(users.id)
    .orderBy(desc(users.createdAt))
    .limit(100);

  return (
    <div>
      <h1 className="text-2xl font-bold">Users</h1>
      <div className="card mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Orders</th>
              <th className="px-4 py-3">Spent</th>
              <th className="px-4 py-3">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(({ user: u, orderCount, spent }) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/admin/users/${u.id}`} className="font-semibold text-indigo-600 hover:underline">{u.name}</Link>
                  <p className="text-xs text-slate-500">{u.email}</p>
                </td>
                <td className="px-4 py-3 capitalize">{u.role.replace("_", " ")}</td>
                <td className="px-4 py-3"><span className={`badge ${statusBadgeClass(u.status)}`}>{u.status}</span></td>
                <td className="px-4 py-3">{orderCount}</td>
                <td className="px-4 py-3 font-semibold">{formatINR(spent)}</td>
                <td className="px-4 py-3 text-slate-500">{formatDate(u.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

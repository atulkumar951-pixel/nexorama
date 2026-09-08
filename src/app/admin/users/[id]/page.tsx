import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { accessGrants, downloads, orders, productAssets, products, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { formatDate, formatINR, statusBadgeClass } from "@/lib/format";
import { restoreAccessAction, revokeAccessAction, setUserStatus } from "@/lib/actions/admin-actions";
import { SubmitButton, ConfirmButton } from "@/components/client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · User Details" };

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [user] = await db.select().from(users).where(eq(users.id, Number(id))).limit(1);
  if (!user) notFound();

  const [userOrders, grants, userDownloads] = await Promise.all([
    db.select().from(orders).where(eq(orders.userId, user.id)).orderBy(desc(orders.createdAt)).limit(20),
    db
      .select({ grant: accessGrants, productTitle: products.title })
      .from(accessGrants)
      .innerJoin(products, eq(accessGrants.productId, products.id))
      .where(eq(accessGrants.userId, user.id))
      .orderBy(desc(accessGrants.grantedAt)),
    db
      .select({ dl: downloads, fileName: productAssets.fileName })
      .from(downloads)
      .innerJoin(productAssets, eq(downloads.assetId, productAssets.id))
      .where(eq(downloads.userId, user.id))
      .orderBy(desc(downloads.createdAt))
      .limit(20),
  ]);

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/users" className="text-sm text-slate-500 hover:text-indigo-600">← All users</Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{user.name}</h1>
          <p className="text-sm text-slate-500">{user.email} · joined {formatDate(user.createdAt)} · <span className={`badge ${statusBadgeClass(user.status)}`}>{user.status}</span></p>
        </div>
        {user.role === "user" && (
          <div className="flex gap-2">
            {user.status === "ACTIVE" ? (
              <form action={setUserStatus.bind(null, user.id, "SUSPENDED")}>
                <SubmitButton className="btn-secondary !text-red-600">Suspend account</SubmitButton>
              </form>
            ) : (
              <form action={setUserStatus.bind(null, user.id, "ACTIVE")}>
                <SubmitButton className="btn-primary !bg-emerald-600 hover:!bg-emerald-700">Reactivate account</SubmitButton>
              </form>
            )}
          </div>
        )}
      </div>

      <div className="card mt-6 p-6">
        <h2 className="font-bold">Access grants ({grants.length})</h2>
        <ul className="mt-3 divide-y divide-slate-100 text-sm">
          {grants.map(({ grant: g, productTitle }) => (
            <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <div>
                <p className="font-medium">{productTitle}</p>
                <p className="text-xs text-slate-500">
                  Granted {formatDate(g.grantedAt)} · {g.expiresAt ? `expires ${formatDate(g.expiresAt)}` : "lifetime"}
                  {g.reason ? ` · ${g.reason}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`badge ${statusBadgeClass(g.status)}`}>{g.status}</span>
                {g.status === "ACTIVE" ? (
                  <ConfirmButton
                    action={revokeAccessAction.bind(null, g.id, "Revoked by admin")}
                    confirmText="Revoke this user's access to the product?"
                    className="text-xs font-semibold text-red-600 hover:underline"
                  >
                    Revoke
                  </ConfirmButton>
                ) : (
                  <ConfirmButton
                    action={restoreAccessAction.bind(null, g.id)}
                    confirmText="Restore this user's access?"
                    className="text-xs font-semibold text-emerald-600 hover:underline"
                  >
                    Restore
                  </ConfirmButton>
                )}
              </div>
            </li>
          ))}
          {grants.length === 0 && <li className="py-3 text-slate-400">No purchased products.</li>}
        </ul>
      </div>

      <div className="card mt-6 p-6">
        <h2 className="font-bold">Orders ({userOrders.length})</h2>
        <ul className="mt-3 divide-y divide-slate-100 text-sm">
          {userOrders.map((o) => (
            <li key={o.id} className="flex items-center justify-between py-2.5">
              <Link href={`/admin/orders/${o.id}`} className="font-semibold text-indigo-600 hover:underline">{o.orderNumber}</Link>
              <div className="flex items-center gap-3">
                <span className="font-semibold">{formatINR(o.total)}</span>
                <span className={`badge ${statusBadgeClass(o.status)}`}>{o.status}</span>
                <span className="text-xs text-slate-500">{formatDate(o.createdAt)}</span>
              </div>
            </li>
          ))}
          {userOrders.length === 0 && <li className="py-3 text-slate-400">No orders.</li>}
        </ul>
      </div>

      <div className="card mt-6 p-6">
        <h2 className="font-bold">Download history</h2>
        <ul className="mt-3 divide-y divide-slate-100 text-sm">
          {userDownloads.map(({ dl, fileName }) => (
            <li key={dl.id} className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium">{fileName}</p>
                <p className="text-xs text-slate-500">{formatDate(dl.createdAt)} · IP {dl.ipAddress ?? "—"}</p>
              </div>
              <span className={`badge ${statusBadgeClass(dl.status)}`}>{dl.status}</span>
            </li>
          ))}
          {userDownloads.length === 0 && <li className="py-3 text-slate-400">No downloads.</li>}
        </ul>
      </div>
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { accessGrants, products } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { formatDate, statusBadgeClass } from "@/lib/format";
import { TYPE_LABELS } from "@/components/ProductCard";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Library" };

export default async function LibraryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/library");

  const rows = await db
    .select({ grant: accessGrants, product: products })
    .from(accessGrants)
    .innerJoin(products, eq(accessGrants.productId, products.id))
    .where(eq(accessGrants.userId, user.id))
    .orderBy(desc(accessGrants.grantedAt));

  // De-duplicate: keep the best grant per product (ACTIVE first)
  const byProduct = new Map<number, (typeof rows)[number]>();
  for (const r of rows) {
    const existing = byProduct.get(r.product.id);
    if (!existing || (existing.grant.status !== "ACTIVE" && r.grant.status === "ACTIVE")) {
      byProduct.set(r.product.id, r);
    }
  }
  const items = [...byProduct.values()];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-bold">My Library</h1>
      <p className="mt-1 text-slate-500">All your purchased digital products in one place.</p>

      {items.length === 0 ? (
        <div className="card mt-8 p-16 text-center">
          <p className="text-5xl">📚</p>
          <p className="mt-4 font-semibold text-slate-700">Your library is empty</p>
          <p className="text-sm text-slate-500">Purchased products appear here instantly after payment.</p>
          <Link href="/products" className="btn-primary mt-6">Browse Marketplace</Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(({ grant, product }) => (
            <div key={product.id} className="card overflow-hidden">
              <div className="aspect-[16/9] bg-indigo-50">
                {product.coverImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.coverImage} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-5xl">📚</div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-500">{TYPE_LABELS[product.productType] ?? product.productType}</span>
                  <span className={`badge ${statusBadgeClass(grant.status)}`}>{grant.status}</span>
                </div>
                <h3 className="mt-1 font-semibold">{product.title}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Purchased {formatDate(grant.grantedAt)} · {grant.expiresAt ? `Expires ${formatDate(grant.expiresAt)}` : "Lifetime access"}
                </p>
                {grant.status === "ACTIVE" ? (
                  <Link href={`/library/${product.id}`} className="btn-primary mt-4 w-full">Open →</Link>
                ) : (
                  <div className="mt-4 rounded-lg bg-slate-100 p-2 text-center text-xs text-slate-500">
                    Access {grant.status.toLowerCase()}{grant.reason ? ` · ${grant.reason}` : ""}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

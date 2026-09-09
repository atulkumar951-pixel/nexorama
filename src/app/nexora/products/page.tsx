import Link from "next/link";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { formatDate, formatINR, statusBadgeClass } from "@/lib/format";
import { setProductStatus, deleteProductAction } from "@/lib/actions/admin-actions";
import { SubmitButton, ConfirmButton } from "@/components/client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Products" };

export default async function AdminProductsPage() {
  const rows = await db
    .select({ product: products, categoryName: categories.name })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .orderBy(desc(products.createdAt))
    .limit(100);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <Link href="/nexora/products/new" className="btn-primary">+ Add Product</Link>
      </div>
      <div className="card mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Sales</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(({ product: p, categoryName }) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/nexora/products/${p.id}`} className="font-semibold text-indigo-600 hover:underline">{p.title}</Link>
                  {p.isFeatured && <span className="badge ml-2 bg-amber-100 text-amber-700">★</span>}
                </td>
                <td className="px-4 py-3 text-slate-500">{categoryName ?? "—"}</td>
                <td className="px-4 py-3">{p.productType}</td>
                <td className="px-4 py-3 font-semibold">
                  {p.isFree ? "Free" : formatINR(p.salePrice ?? p.price)}
                  {p.salePrice !== null && <span className="ml-1 text-xs text-slate-400 line-through">{formatINR(p.price)}</span>}
                </td>
                <td className="px-4 py-3">{p.salesCount}</td>
                <td className="px-4 py-3"><span className={`badge ${statusBadgeClass(p.status)}`}>{p.status}</span></td>
                <td className="px-4 py-3 text-slate-500">{formatDate(p.createdAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5 text-xs">
                    <Link
                      href={`/nexora/products/${p.id}`}
                      className="font-semibold text-indigo-600 hover:underline"
                    >
                      Edit
                    </Link>
                    {p.status !== "PUBLISHED" && (
                      <form action={setProductStatus.bind(null, p.id, "PUBLISHED")}>
                        <SubmitButton className="font-semibold text-emerald-600 hover:underline" pendingText="…">Publish</SubmitButton>
                      </form>
                    )}
                    {p.status === "PUBLISHED" && (
                      <form action={setProductStatus.bind(null, p.id, "UNPUBLISHED")}>
                        <SubmitButton className="font-semibold text-amber-600 hover:underline" pendingText="…">Unpublish</SubmitButton>
                      </form>
                    )}
                    {p.status !== "ARCHIVED" && (
                      <form action={setProductStatus.bind(null, p.id, "ARCHIVED")}>
                        <SubmitButton className="font-semibold text-slate-500 hover:underline" pendingText="…">Archive</SubmitButton>
                      </form>
                    )}
                    <ConfirmButton
                      action={deleteProductAction.bind(null, p.id)}
                      confirmText={`Are you sure you want to permanently delete "${p.title}"? This cannot be undone.`}
                      className="font-semibold text-red-600 hover:underline"
                    >
                      Delete
                    </ConfirmButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

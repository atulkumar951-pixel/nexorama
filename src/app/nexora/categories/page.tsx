import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import ActionForm from "@/components/ActionForm";
import { saveCategoryAction } from "@/lib/actions/admin-actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Categories" };

export default async function AdminCategoriesPage() {
  const rows = await db
    .select({ category: categories, productCount: sql<number>`count(${products.id})::int` })
    .from(categories)
    .leftJoin(products, and(eq(products.categoryId, categories.id)))
    .groupBy(categories.id)
    .orderBy(categories.sortOrder);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <div>
        <h1 className="text-2xl font-bold">Categories</h1>
        <div className="card mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Products</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(({ category: c, productCount }) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-semibold">{c.emoji} {c.name}</td>
                  <td className="px-4 py-3 text-slate-500">{c.slug}</td>
                  <td className="px-4 py-3">{productCount}</td>
                  <td className="px-4 py-3">{c.sortOrder}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${c.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                      {c.isActive ? "Active" : "Hidden"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="card h-fit p-6">
        <h2 className="font-bold">Add category</h2>
        <div className="mt-4">
          <ActionForm action={saveCategoryAction} submitLabel="Save category">
            <div>
              <label className="label">Name *</label>
              <input name="name" required className="input" placeholder="Programming" />
            </div>
            <div>
              <label className="label">Emoji</label>
              <input name="emoji" className="input" placeholder="💻" defaultValue="📚" />
            </div>
            <div>
              <label className="label">Description</label>
              <input name="description" className="input" />
            </div>
            <div>
              <label className="label">Sort order</label>
              <input name="sortOrder" type="number" defaultValue={0} className="input" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isActive" defaultChecked className="h-4 w-4 rounded" /> Visible on storefront
            </label>
          </ActionForm>
        </div>
      </div>
    </div>
  );
}

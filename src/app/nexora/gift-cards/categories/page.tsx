import Link from "next/link";
import { db } from "@/db";
import { giftCategories, giftProducts } from "@/db/schema";
import { count, eq } from "drizzle-orm";
import { formatDate } from "@/lib/format";
import CategoryFormClient from "./category-form-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Gift Categories" };

export default async function AdminGiftCategoriesPage() {
  const categories = await db
    .select({
      id: giftCategories.id,
      name: giftCategories.name,
      slug: giftCategories.slug,
      description: giftCategories.description,
      icon: giftCategories.icon,
      image: giftCategories.image,
      status: giftCategories.status,
      sortOrder: giftCategories.sortOrder,
      createdAt: giftCategories.createdAt,
    })
    .from(giftCategories)
    .orderBy(giftCategories.sortOrder, giftCategories.name);

  // Get product counts for each category
  const productCountMap: Record<number, number> = {};
  const counts = await db
    .select({
      categoryId: giftProducts.categoryId,
      productCount: count(),
    })
    .from(giftProducts)
    .groupBy(giftProducts.categoryId);

  for (const c of counts) {
    if (c.categoryId) {
      productCountMap[c.categoryId] = c.productCount;
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gift Code Categories</h1>
          <p className="text-sm text-slate-500">
            Create and organize categories for gift cards (Gaming, Shopping, OTT, Subscriptions, Software, etc.)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/nexora/gift-cards" className="text-sm font-semibold text-indigo-600 hover:underline">
            ← Gift dashboard
          </Link>
          <Link href="/nexora/gift-cards/products" className="btn-secondary !py-1.5 text-xs">
            Manage Products →
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Add category form */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900">Create New Category</h2>
          <p className="mt-1 text-xs text-slate-500">Add custom categories for vouchers and gift cards.</p>
          <CategoryFormClient />
        </div>

        {/* Right: Existing categories table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden lg:col-span-2">
          <div className="border-b border-slate-100 p-4">
            <h2 className="font-bold text-slate-900">Categories ({categories.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3">Products</th>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">{c.icon || "🎁"}</span>
                        <div>
                          <p className="font-semibold text-slate-900">{c.name}</p>
                          {c.description && <p className="text-xs text-slate-500 truncate max-w-xs">{c.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{c.slug}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                        {productCountMap[c.id] ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{c.sortOrder}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${
                          c.status === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDate(c.createdAt)}</td>
                  </tr>
                ))}
                {categories.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      No gift categories created yet. Use the form on the left to add your first category.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

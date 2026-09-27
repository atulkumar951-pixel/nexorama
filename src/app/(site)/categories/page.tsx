import Link from "next/link";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";

import { redirect } from "next/navigation";
import { getMarketplaceMode } from "@/lib/marketplace-mode";

export const dynamic = "force-dynamic";
export const metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const mode = await getMarketplaceMode();
  if (mode === "GIFT_CODES") {
    redirect("/gift-codes");
  }
  const rows = await db
    .select({
      category: categories,
      productCount: sql<number>`count(${products.id})::int`,
    })
    .from(categories)
    .leftJoin(products, and(eq(products.categoryId, categories.id), eq(products.status, "PUBLISHED")))
    .where(eq(categories.isActive, true))
    .groupBy(categories.id)
    .orderBy(categories.sortOrder);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-bold">All Categories</h1>
      <p className="mt-1 text-slate-500">Find study material organized by subject.</p>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(({ category: c, productCount }) => (
          <Link key={c.id} href={`/products?category=${c.slug}`} className="card flex items-start gap-4 p-6 transition hover:border-indigo-300 hover:shadow-md">
            <span className="text-4xl">{c.emoji}</span>
            <div>
              <p className="text-lg font-semibold text-slate-900">{c.name}</p>
              <p className="mt-1 text-sm text-slate-500">{c.description}</p>
              <p className="mt-2 text-xs font-semibold text-indigo-600">{productCount} products →</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

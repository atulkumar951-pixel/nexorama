import Link from "next/link";
import { db } from "@/db";
import { categories, products, giftCategories, giftProducts } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { getMarketplaceMode } from "@/lib/marketplace-mode";

export const dynamic = "force-dynamic";
export const metadata = { title: "Categories | Nexora" };

export default async function CategoriesPage() {
  const mode = await getMarketplaceMode();

  if (mode === "GIFT_CODES") {
    const giftRows = await db
      .select({
        category: giftCategories,
        productCount: sql<number>`count(${giftProducts.id})::int`,
      })
      .from(giftCategories)
      .leftJoin(
        giftProducts,
        and(eq(giftProducts.categoryId, giftCategories.id), eq(giftProducts.status, "PUBLISHED"))
      )
      .where(eq(giftCategories.status, "ACTIVE"))
      .groupBy(giftCategories.id)
      .orderBy(giftCategories.sortOrder, giftCategories.name);

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 py-12">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-10 text-center max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/60 px-3.5 py-1 text-xs font-bold text-emerald-400">
              ⚡ OFFICIAL BRAND VOUCHERS
            </span>
            <h1 className="mt-3 text-3xl sm:text-4xl font-black text-white">Gift Voucher Categories</h1>
            <p className="mt-2 text-sm text-slate-400">
              Browse top digital vouchers for Gaming, OTT, Shopping, Food &amp; Entertainment.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {giftRows.map(({ category: c, productCount }) => (
              <Link
                key={c.id}
                href={`/gift-codes?category=${c.slug}`}
                className="group relative flex items-start gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-sm hover:border-emerald-500/50 hover:bg-slate-850 hover:shadow-xl hover:shadow-emerald-950/30 transition duration-300"
              >
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-3xl border border-emerald-500/20 group-hover:scale-110 transition duration-300">
                  {c.icon || "🎁"}
                </span>
                <div className="flex-1">
                  <p className="text-lg font-bold text-white group-hover:text-emerald-400 transition">{c.name}</p>
                  <p className="mt-1 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {c.description || "Official brand vouchers and gift cards."}
                  </p>
                  <p className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-emerald-400 group-hover:translate-x-0.5 transition">
                    <span>{productCount} Voucher{productCount !== 1 ? "s" : ""}</span>
                    <span>→</span>
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Digital Marketplace Categories
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
      <h1 className="text-3xl font-bold text-slate-900">All Categories</h1>
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

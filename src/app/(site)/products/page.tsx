import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { and, asc, desc, eq, ilike, or, SQL } from "drizzle-orm";
import ProductCard from "@/components/ProductCard";
import Link from "next/link";

import { redirect } from "next/navigation";
import { getMarketplaceMode } from "@/lib/marketplace-mode";

export const dynamic = "force-dynamic";
export const metadata = { title: "Marketplace" };

const PAGE_SIZE = 12;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; type?: string; sort?: string; filter?: string; page?: string }>;
}) {
  const mode = await getMarketplaceMode();
  if (mode === "GIFT_CODES") {
    redirect("/gift-codes");
  }
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page || 1));

  const conditions: SQL[] = [eq(products.status, "PUBLISHED")];
  if (sp.q) {
    const like = `%${sp.q}%`;
    conditions.push(
      or(ilike(products.title, like), ilike(products.shortDescription, like), ilike(products.description, like))!
    );
  }
  let activeCategory = null;
  if (sp.category) {
    const [cat] = await db.select().from(categories).where(eq(categories.slug, sp.category)).limit(1);
    if (cat) {
      activeCategory = cat;
      conditions.push(eq(products.categoryId, cat.id));
    }
  }
  if (sp.type) conditions.push(eq(products.productType, sp.type));
  if (sp.filter === "free") conditions.push(eq(products.isFree, true));

  const orderBy =
    sp.sort === "price-asc"
      ? asc(products.price)
      : sp.sort === "price-desc"
        ? desc(products.price)
        : sp.sort === "popular"
          ? desc(products.salesCount)
          : desc(products.createdAt);

  const rows = await db
    .select({ product: products, categoryName: categories.name })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(and(...conditions))
    .orderBy(orderBy)
    .limit(PAGE_SIZE + 1)
    .offset((page - 1) * PAGE_SIZE);

  const hasNext = rows.length > PAGE_SIZE;
  const items = rows.slice(0, PAGE_SIZE);
  const allCats = await db.select().from(categories).where(eq(categories.isActive, true)).orderBy(categories.sortOrder);

  const qs = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { ...sp, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    return `/products?${params.toString()}`;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl font-bold">
        {activeCategory ? activeCategory.name : sp.q ? `Results for “${sp.q}”` : "Marketplace"}
      </h1>
      <p className="mt-1 text-slate-500">{activeCategory?.description ?? "Browse all published digital products."}</p>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Link href={qs({ category: undefined, page: undefined })} className={`badge ${!sp.category ? "bg-indigo-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}>All</Link>
        {allCats.map((c) => (
          <Link key={c.id} href={qs({ category: c.slug, page: undefined })} className={`badge ${sp.category === c.slug ? "bg-indigo-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}>
            {c.emoji} {c.name}
          </Link>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        <span className="text-slate-500">Type:</span>
        {["PDF", "ZIP", "EBOOK", "COURSE", "BUNDLE"].map((t) => (
          <Link key={t} href={qs({ type: sp.type === t ? undefined : t, page: undefined })} className={`badge ${sp.type === t ? "bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300" : "bg-white text-slate-500 ring-1 ring-slate-200"}`}>
            {t}
          </Link>
        ))}
        <Link href={qs({ filter: sp.filter === "free" ? undefined : "free", page: undefined })} className={`badge ${sp.filter === "free" ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300" : "bg-white text-slate-500 ring-1 ring-slate-200"}`}>
          Free only
        </Link>
        <span className="ml-auto text-slate-500">Sort:</span>
        {[
          ["newest", "Newest"],
          ["popular", "Popular"],
          ["price-asc", "Price ↑"],
          ["price-desc", "Price ↓"],
        ].map(([key, label]) => (
          <Link key={key} href={qs({ sort: key, page: undefined })} className={`badge ${(sp.sort ?? "newest") === key ? "bg-slate-900 text-white" : "bg-white text-slate-500 ring-1 ring-slate-200"}`}>
            {label}
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="card mt-10 p-16 text-center text-slate-500">
          <p className="text-4xl">🔍</p>
          <p className="mt-3 font-semibold text-slate-700">No products found</p>
          <p className="text-sm">Try a different search or category.</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map(({ product, categoryName }) => (
            <ProductCard key={product.id} p={{ ...product, categoryName }} />
          ))}
        </div>
      )}

      <div className="mt-10 flex items-center justify-center gap-3">
        {page > 1 && <Link href={qs({ page: String(page - 1) })} className="btn-secondary">← Previous</Link>}
        {hasNext && <Link href={qs({ page: String(page + 1) })} className="btn-secondary">Next →</Link>}
      </div>
    </div>
  );
}

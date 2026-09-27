import { db } from "@/db";
import { giftProducts, giftCodes, giftCategories } from "@/db/schema";
import { and, eq, sql, desc } from "drizzle-orm";
import Link from "next/link";
import { getMarketplaceMode } from "@/lib/marketplace-mode";
import { redirect } from "next/navigation";
import { formatINR } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Gift Codes | Nexora",
  description: "Browse premium gift cards, gaming vouchers, OTT subscriptions and more. Instant digital delivery.",
};

export default async function GiftCodesStorefrontPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const mode = await getMarketplaceMode();
  if (mode !== "GIFT_CODES") redirect("/");

  const { q, category } = await searchParams;

  // Load categories
  const cats = await db
    .select()
    .from(giftCategories)
    .where(eq(giftCategories.status, "ACTIVE"))
    .orderBy(giftCategories.sortOrder, giftCategories.name);

  // Build products query
  let productsQuery = db
    .select({
      id: giftProducts.id,
      name: giftProducts.name,
      brandName: giftProducts.brandName,
      slug: giftProducts.slug,
      image: giftProducts.image,
      denomination: giftProducts.denomination,
      sellingPrice: giftProducts.sellingPrice,
      isFeatured: giftProducts.isFeatured,
      categoryId: giftProducts.categoryId,
      description: giftProducts.description,
      available: sql<number>`count(*) filter (where ${giftCodes.status} = 'AVAILABLE')::int`,
    })
    .from(giftProducts)
    .leftJoin(giftCodes, eq(giftCodes.giftProductId, giftProducts.id))
    .where(eq(giftProducts.status, "PUBLISHED"))
    .groupBy(
      giftProducts.id,
      giftProducts.name,
      giftProducts.brandName,
      giftProducts.slug,
      giftProducts.image,
      giftProducts.denomination,
      giftProducts.sellingPrice,
      giftProducts.isFeatured,
      giftProducts.categoryId,
      giftProducts.description
    )
    .orderBy(desc(giftProducts.isFeatured), giftProducts.sortOrder, giftProducts.name)
    .$dynamic();

  const allProducts = await productsQuery;

  // Client-side filtering (simple, for demo)
  let filtered = allProducts;
  if (category) {
    const cat = cats.find((c) => c.slug === category);
    if (cat) filtered = filtered.filter((p) => p.categoryId === cat.id);
  }
  if (q) {
    const lq = q.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(lq) ||
        p.brandName.toLowerCase().includes(lq) ||
        (p.description ?? "").toLowerCase().includes(lq)
    );
  }

  const featured = filtered.filter((p) => p.isFeatured);
  const all = filtered;

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/60 via-white to-slate-50">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-emerald-100 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(255,255,255,0.10),rgba(0,0,0,0))]" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-4 py-1.5 text-xs font-semibold backdrop-blur-sm mb-5">
              <span className="h-2 w-2 rounded-full bg-yellow-300 animate-pulse" />
              ⚡ Instant Code Delivery After Payment
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
              Premium Gift Cards &{" "}
              <span className="text-yellow-300">Digital Vouchers</span>
            </h1>
            <p className="mt-4 text-lg text-emerald-100">
              Gaming, OTT, shopping &amp; lifestyle — top brands at the best prices. Codes delivered directly to your email.
            </p>
            <form action="/gift-codes" className="mt-8 mx-auto flex max-w-md gap-2">
              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Search Amazon, Netflix, Steam…"
                className="flex-1 rounded-xl border border-white/30 bg-white/15 px-4 py-3 text-sm text-white placeholder-emerald-200 backdrop-blur-sm focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
                aria-label="Search gift cards"
              />
              <button
                type="submit"
                className="rounded-xl bg-yellow-400 px-5 py-3 text-sm font-bold text-emerald-900 hover:bg-yellow-300 transition"
              >
                Search
              </button>
            </form>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10">
        {/* Categories filter row */}
        {cats.length > 0 && (
          <div className="mb-8 flex flex-wrap gap-2">
            <Link
              href="/gift-codes"
              className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
                !category
                  ? "border-emerald-600 bg-emerald-600 text-white shadow"
                  : "border-slate-200 bg-white text-slate-600 hover:border-emerald-400 hover:text-emerald-700"
              }`}
            >
              All
            </Link>
            {cats.map((c) => (
              <Link
                key={c.id}
                href={`/gift-codes?category=${c.slug}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
                  category === c.slug
                    ? "border-emerald-600 bg-emerald-600 text-white shadow"
                    : "border-slate-200 bg-white text-slate-600 hover:border-emerald-400 hover:text-emerald-700"
                }`}
              >
                {c.icon} {c.name}
              </Link>
            ))}
          </div>
        )}

        {/* Search result context */}
        {(q || category) && (
          <p className="mb-5 text-sm text-slate-500">
            Showing {all.length} result{all.length !== 1 ? "s" : ""}
            {q && <> for &ldquo;<strong className="text-slate-800">{q}</strong>&rdquo;</>}
            {category && <> in <strong className="text-slate-800">{cats.find((c) => c.slug === category)?.name ?? category}</strong></>}
            {" · "}
            <Link href="/gift-codes" className="text-emerald-600 hover:underline">Clear filters</Link>
          </p>
        )}

        {/* Featured */}
        {featured.length > 0 && !q && !category && (
          <section className="mb-12">
            <h2 className="mb-5 text-xl font-bold text-slate-900">⭐ Featured Gift Cards</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((p) => (
                <GiftProductCard key={p.id} product={p} featured />
              ))}
            </div>
          </section>
        )}

        {/* All products */}
        <section>
          <h2 className="mb-5 text-xl font-bold text-slate-900">
            {q || category ? "Results" : "All Gift Cards & Vouchers"}
          </h2>
          {all.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="text-5xl mb-4">🔍</div>
              <p className="text-xl font-semibold text-slate-700">No gift cards found</p>
              <p className="mt-1 text-sm text-slate-500">Try a different search or browse all categories.</p>
              <Link href="/gift-codes" className="mt-4 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition">
                Browse All
              </Link>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {all.map((p) => (
                <GiftProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

type GiftProductCardProps = {
  product: {
    id: number;
    name: string;
    brandName: string;
    slug: string;
    image: string | null;
    denomination: number;
    sellingPrice: number;
    isFeatured: boolean;
    description: string | null;
    available: number;
  };
  featured?: boolean;
};

function GiftProductCard({ product: p, featured }: GiftProductCardProps) {
  const discount =
    p.denomination > p.sellingPrice
      ? Math.round(((p.denomination - p.sellingPrice) / p.denomination) * 100)
      : 0;
  const inStock = p.available > 0;

  return (
    <Link
      href={`/gift-codes/${p.slug}`}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition duration-200 hover:border-emerald-300 hover:shadow-md ${
        featured ? "border-yellow-200 shadow-yellow-100/80" : "border-slate-200"
      }`}
    >
      {/* Image */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-50 h-44">
        {p.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.image}
            alt={`${p.brandName} ${p.name}`}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-5xl">🎁</span>
          </div>
        )}
        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
          {featured && (
            <span className="rounded-full bg-yellow-400 px-2 py-0.5 text-[10px] font-bold text-yellow-900">
              ⭐ Featured
            </span>
          )}
          {discount > 0 && (
            <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
              {discount}% OFF
            </span>
          )}
        </div>
        {!inStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-800">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">{p.brandName}</p>
        <p className="mt-0.5 font-bold text-slate-900 line-clamp-2">{p.name}</p>
        <div className="mt-auto pt-3 flex items-end justify-between">
          <div>
            <p className="text-lg font-extrabold text-slate-900">{formatINR(p.sellingPrice)}</p>
            {discount > 0 && (
              <p className="text-xs text-slate-400 line-through">{formatINR(p.denomination)}</p>
            )}
          </div>
          <span
            className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
              inStock
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-100 text-slate-400"
            }`}
          >
            {inStock ? `${p.available} left` : "OOS"}
          </span>
        </div>
      </div>
    </Link>
  );
}

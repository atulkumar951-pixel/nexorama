import Link from "next/link";
import { db } from "@/db";
import { banners, categories, products } from "@/db/schema";
import { and, desc, eq, gte, isNull, lte, or } from "drizzle-orm";
import ProductCard from "@/components/ProductCard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const now = new Date();
  const activeBanner = and(
    eq(banners.isActive, true),
    or(isNull(banners.startsAt), lte(banners.startsAt, now)),
    or(isNull(banners.endsAt), gte(banners.endsAt, now))
  );

  const [heroBanners, promoBanners, cats, featured, latest] = await Promise.all([
    db.select().from(banners).where(and(activeBanner, eq(banners.position, "HERO"))).orderBy(desc(banners.priority)).limit(1),
    db.select().from(banners).where(and(activeBanner, eq(banners.position, "PROMO"))).orderBy(desc(banners.priority)).limit(2),
    db.select().from(categories).where(eq(categories.isActive, true)).orderBy(categories.sortOrder).limit(8),
    db
      .select({ product: products, categoryName: categories.name })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(and(eq(products.status, "PUBLISHED"), eq(products.isFeatured, true)))
      .orderBy(desc(products.salesCount))
      .limit(4),
    db
      .select({ product: products, categoryName: categories.name })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.status, "PUBLISHED"))
      .orderBy(desc(products.createdAt))
      .limit(8),
  ]);

  const hero = heroBanners[0];

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-slate-900 text-white">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40"
          style={{ backgroundImage: `url(${hero?.image || "/images/hero.jpg"})` }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-indigo-950/60 to-transparent" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:py-28">
          <span className="badge bg-indigo-500/20 text-indigo-200 ring-1 ring-indigo-400/40">
            ⚡ Instant digital delivery
          </span>
          <h1 className="mt-4 max-w-2xl text-4xl font-extrabold leading-tight sm:text-5xl">
            {hero?.title ?? "Premium Notes, eBooks & Courses for Serious Learners"}
          </h1>
          <p className="mt-4 max-w-xl text-lg text-slate-300">
            {hero?.subtitle ??
              "Download study material, code packs and digital books — or stream lecture series. Everything lives forever in your personal library."}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={hero?.buttonUrl || "/products"} className="btn-primary !px-6 !py-3 !text-base">
              {hero?.buttonText || "Browse Marketplace"}
            </Link>
            <Link href="/categories" className="btn-secondary !border-white/20 !bg-white/10 !px-6 !py-3 !text-base !text-white hover:!bg-white/20">
              Explore Categories
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4">
        {/* Categories */}
        <section className="py-12">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="text-2xl font-bold">Browse Categories</h2>
            <Link href="/categories" className="text-sm font-semibold text-indigo-600 hover:underline">View all →</Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {cats.map((c) => (
              <Link
                key={c.id}
                href={`/products?category=${c.slug}`}
                className="card flex items-center gap-3 p-4 transition hover:border-indigo-300 hover:shadow-md"
              >
                <span className="text-3xl">{c.emoji}</span>
                <div>
                  <p className="font-semibold text-slate-900">{c.name}</p>
                  <p className="line-clamp-1 text-xs text-slate-500">{c.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Featured */}
        {featured.length > 0 && (
          <section className="py-6">
            <div className="mb-6 flex items-end justify-between">
              <h2 className="text-2xl font-bold">⭐ Featured Products</h2>
              <Link href="/products" className="text-sm font-semibold text-indigo-600 hover:underline">View all →</Link>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map(({ product, categoryName }) => (
                <ProductCard key={product.id} p={{ ...product, categoryName }} />
              ))}
            </div>
          </section>
        )}

        {/* Promo banners */}
        {promoBanners.length > 0 && (
          <section className="grid gap-4 py-8 sm:grid-cols-2">
            {promoBanners.map((b) => (
              <div key={b.id} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 p-8 text-white">
                <p className="text-xl font-bold">{b.title}</p>
                {b.subtitle && <p className="mt-1 text-indigo-100">{b.subtitle}</p>}
                {b.buttonUrl && (
                  <Link href={b.buttonUrl} className="mt-4 inline-block rounded-lg bg-white px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50">
                    {b.buttonText ?? "Shop now"}
                  </Link>
                )}
              </div>
            ))}
          </section>
        )}

        {/* Latest */}
        <section className="py-6">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="text-2xl font-bold">🆕 Latest Products</h2>
            <Link href="/products?sort=newest" className="text-sm font-semibold text-indigo-600 hover:underline">View all →</Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {latest.map(({ product, categoryName }) => (
              <ProductCard key={product.id} p={{ ...product, categoryName }} />
            ))}
          </div>
        </section>

        {/* Why choose us */}
        <section className="py-12">
          <h2 className="mb-8 text-center text-2xl font-bold">Why Choose DigiMart?</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: "⚡", title: "Instant Access", desc: "Products appear in your library the moment payment succeeds." },
              { icon: "🔒", title: "Secure Downloads", desc: "Expiring signed links keep your purchases protected." },
              { icon: "💳", title: "Razorpay Payments", desc: "Pay safely with UPI, cards, netbanking and wallets." },
              { icon: "🎓", title: "Curated Content", desc: "Hand-picked notes, books and lecture series from experts." },
            ].map((f) => (
              <div key={f.title} className="card p-6 text-center">
                <div className="text-4xl">{f.icon}</div>
                <p className="mt-3 font-semibold">{f.title}</p>
                <p className="mt-1 text-sm text-slate-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

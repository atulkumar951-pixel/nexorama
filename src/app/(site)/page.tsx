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
  const heroImageUrl =
    hero?.image ||
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRIFYbKT9V72uxtmxd4wSl1ig5r9G9-dMJF7fReKyw7xwOJwCtvi_1Ft5xA&s=10";

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-slate-950 text-white min-h-[540px] flex items-center">
        {/* Full-screen background image with blur effect */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-75 filter blur-[6px] scale-110"
          style={{ backgroundImage: `url(${heroImageUrl})` }}
          aria-hidden
        />
        {/* Dark gradient overlay to ensure text contrast while keeping artwork visible */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/80 to-slate-950/60" aria-hidden />

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:py-28 w-full">
          <div className="max-w-3xl">
            <span className="badge bg-indigo-500/30 text-indigo-200 ring-1 ring-indigo-400/50 backdrop-blur-md">
              ⚡ Instant digital delivery
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl text-white drop-shadow-md">
              {hero?.title ?? "Premium Notes, eBooks & Courses for Serious Learners"}
            </h1>
            <p className="mt-5 text-lg sm:text-xl text-slate-200 drop-shadow">
              {hero?.subtitle ??
                "Download study material, code packs and digital books — or stream lecture series. Everything lives forever in your personal library."}
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href={hero?.buttonUrl || "/products"}
                className="btn-primary !px-7 !py-3.5 !text-base shadow-xl shadow-indigo-600/40 hover:shadow-indigo-500/50 transition duration-200"
              >
                {hero?.buttonText || "Browse Marketplace"}
              </Link>
              <Link
                href="/categories"
                className="btn-secondary !border-white/30 !bg-white/15 !px-7 !py-3.5 !text-base !text-white hover:!bg-white/25 backdrop-blur-md transition duration-200"
              >
                Explore Categories
              </Link>
            </div>

            {/* Trust badges */}
            <div className="mt-12 flex flex-wrap items-center gap-4 sm:gap-6 border-t border-white/15 pt-6 text-xs sm:text-sm font-medium text-slate-200">
              <div className="flex items-center gap-2 bg-slate-900/50 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10">
                <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                <span>Instant Lifetime Access</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-900/50 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10">
                <span className="h-2 w-2 rounded-full bg-indigo-400"></span>
                <span>High-Yield Study Packs</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-900/50 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10">
                <span className="h-2 w-2 rounded-full bg-amber-400"></span>
                <span>Verified Razorpay Checkout</span>
              </div>
            </div>
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
          <h2 className="mb-8 text-center text-2xl font-bold">Why Choose Nexora?</h2>
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

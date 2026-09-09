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
      <section className="relative overflow-hidden bg-gradient-to-b from-white via-indigo-50/40 to-slate-50 border-b border-slate-200/80 text-slate-900">
        {/* Delicate ambient light gradient */}
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.12),rgba(255,255,255,0))]"
          aria-hidden
        />

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-12">
            {/* Left Content Column */}
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/80 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm backdrop-blur-sm">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>⚡ Instant Digital Delivery & Lifetime Access</span>
              </div>

              <h1 className="mt-5 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-[3.25rem] leading-[1.15] text-slate-900">
                Premium Notes, eBooks &{" "}
                <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Courses for Serious Learners
                </span>
              </h1>

              <p className="mt-5 text-base sm:text-lg leading-relaxed text-slate-600 max-w-xl">
                {hero?.subtitle ??
                  "Download study material, code packs and digital books — or stream lecture series. Everything lives forever in your personal library."}
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href={hero?.buttonUrl || "/products"}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 px-6 py-3.5 text-sm sm:text-base font-bold text-white shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-300 hover:scale-[1.02] active:scale-[0.98] transition duration-200"
                >
                  <span>{hero?.buttonText || "Browse Marketplace"}</span>
                  <span className="text-lg">→</span>
                </Link>
                <Link
                  href="/categories"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-sm sm:text-base font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-400 hover:scale-[1.02] active:scale-[0.98] transition duration-200"
                >
                  <span>Explore Categories</span>
                </Link>
              </div>

              {/* Trust badges */}
              <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-6 text-xs sm:text-sm text-slate-600">
                <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 shadow-sm">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                  <span className="font-medium text-slate-700">Instant Lifetime Access</span>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 shadow-sm">
                  <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
                  <span className="font-medium text-slate-700">High-Yield Study Packs</span>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 shadow-sm">
                  <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                  <span className="font-medium text-slate-700">Verified Razorpay Checkout</span>
                </div>
              </div>
            </div>

            {/* Right Image Column */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                {/* Ambient back light */}
                <div className="absolute -inset-2 rounded-3xl bg-gradient-to-tr from-indigo-200 via-purple-200 to-pink-200 opacity-60 blur-2xl transition duration-500 hover:opacity-80"></div>

                {/* Showcase card */}
                <div className="group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-2.5 shadow-xl shadow-indigo-100/60 transition duration-300 hover:border-indigo-300 hover:shadow-2xl hover:shadow-indigo-200/50">
                  <div className="relative overflow-hidden rounded-xl">
                    <img
                      src={heroImageUrl}
                      alt="Nexora Digital Learning"
                      className="aspect-[16/10] w-full object-cover transition duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent"></div>

                    {/* Top floating badge */}
                    <div className="absolute top-3 right-3 rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold text-indigo-700 backdrop-blur-md border border-slate-200/80 shadow-sm flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>Live Learning Hub</span>
                    </div>

                    {/* Bottom frosted bar */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-xl bg-white/95 px-3.5 py-2.5 backdrop-blur-md border border-slate-200/80 shadow-md">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">Nexora Learning Hub</p>
                        <p className="text-xs font-semibold text-slate-800">Study & code anytime, anywhere</p>
                      </div>
                      <span className="rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
                        24/7 Access
                      </span>
                    </div>
                  </div>
                </div>
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

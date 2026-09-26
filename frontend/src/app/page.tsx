import Link from "next/link";
import { serverApi } from "@/lib/server-api";
import type { Banner, Category, ProductCard } from "@/lib/types";
import { ProductGrid } from "@/components/product/product-card";

interface HomepageData {
  categories: Category[];
  featured: ProductCard[];
  popular: ProductCard[];
  latest: ProductCard[];
  banners: Banner[];
}

const WHY_POINTS = [
  { title: "Instant Access", text: "Download immediately after payment — no waiting.", icon: "⚡" },
  { title: "Curated Quality", text: "Reviewed, structured, exam-ready material.", icon: "✅" },
  { title: "Secure Purchases", text: "Payments handled by Razorpay with bank-grade security.", icon: "🔒" },
  { title: "Learn Anywhere", text: "Your library follows you across all devices.", icon: "📱" },
];

function SectionHeader({ title, subtitle, href }: { title: string; subtitle?: string; href?: string }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {href && (
        <Link href={href} className="shrink-0 text-sm font-semibold text-primary-700 hover:text-primary-800">
          View all →
        </Link>
      )}
    </div>
  );
}

export default async function HomePage() {
  let data: HomepageData | null = null;
  try {
    data = await serverApi<HomepageData>("/api/homepage");
  } catch {
    data = null;
  }

  const hero = data?.banners.find((b) => b.position === "HERO") ?? data?.banners[0] ?? null;

  return (
    <div className="animate-fade-in-up">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-primary-600">
        <div className="container-page relative py-16 sm:py-24">
          <div className="max-w-2xl">
            {hero && <span className="badge mb-4 bg-accent-500/20 text-accent-400">🎉 {hero.title}</span>}
            <h1 className="text-3xl font-extrabold leading-tight text-white sm:text-5xl">
              {hero?.subtitle ?? "Premium study material, delivered instantly."}
            </h1>
            <p className="mt-4 text-base text-primary-100 sm:text-lg">
              Notes, eBooks, resources and lecture series for learners. Buy once, access forever,
              download instantly.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/products" className="btn bg-white text-primary-800 hover:bg-primary-50">
                Browse Products
              </Link>
              <Link href="/categories" className="btn border border-white/30 text-white hover:bg-white/10">
                Explore Categories
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      {data && data.categories.length > 0 && (
        <section className="container-page py-12">
          <SectionHeader title="Featured Categories" href="/categories" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {data.categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/categories/${cat.slug}`}
                className="card group p-5 transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
              >
                <h3 className="font-semibold text-gray-900 group-hover:text-primary-700">{cat.name}</h3>
                {cat.description && <p className="mt-1 line-clamp-2 text-xs text-gray-500">{cat.description}</p>}
                {cat._count && (
                  <p className="mt-3 text-xs font-medium text-primary-600">
                    {cat._count.products} product{cat._count.products === 1 ? "" : "s"}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured */}
      {data && data.featured.length > 0 && (
        <section className="container-page py-6">
          <SectionHeader title="Featured Products" subtitle="Handpicked by our team" href="/products" />
          <ProductGrid products={data.featured} />
        </section>
      )}

      {/* Why choose us */}
      <section className="container-page py-12">
        <div className="card bg-gradient-to-br from-primary-50 to-white p-8">
          <h2 className="text-center text-xl font-bold text-gray-900 sm:text-2xl">Why Choose Us</h2>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {WHY_POINTS.map((point) => (
              <div key={point.title} className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-2xl shadow-card">
                  {point.icon}
                </div>
                <h3 className="mt-3 font-semibold text-gray-900">{point.title}</h3>
                <p className="mt-1 text-sm text-gray-500">{point.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular */}
      {data && data.popular.length > 0 && (
        <section className="container-page py-6">
          <SectionHeader title="Popular Right Now" subtitle="What learners are buying" />
          <ProductGrid products={data.popular} />
        </section>
      )}

      {/* Latest */}
      {data && data.latest.length > 0 && (
        <section className="container-page py-6 pb-16">
          <SectionHeader title="Latest Releases" subtitle="Fresh additions to the marketplace" />
          <ProductGrid products={data.latest} />
        </section>
      )}

      {/* Empty state when API is unreachable */}
      {!data && (
        <section className="container-page py-24 text-center">
          <h2 className="text-xl font-bold text-gray-900">Marketplace is warming up</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
            We couldn&apos;t reach the catalog service. If you&apos;re running locally, make sure the
            backend API is started on port 5000 and the database is seeded.
          </p>
        </section>
      )}
    </div>
  );
}

import Link from "next/link";
import { serverApi } from "@/lib/server-api";
import { inr, type GiftBanner, type GiftBrand, type GiftCategory, type GiftProductCard as GiftCard } from "@/lib/gift";
import { GiftProductGrid } from "@/components/gift/gift-product-card";

export const metadata = {
  title: "Gift Cards & Codes — secure, emailed delivery",
  description: "Buy gaming, shopping, OTT and software gift codes. Pay securely with Razorpay; your code is emailed within minutes.",
};

interface ProductsPayload {
  products: GiftCard[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  filters: { brands: GiftBrand[]; categories: GiftCategory[] };
}

const SORTS = [
  { value: "relevance", label: "Recommended" },
  { value: "price_asc", label: "Price ↑" },
  { value: "price_desc", label: "Price ↓" },
  { value: "denomination_desc", label: "Value ↓" },
  { value: "newest", label: "Newest" },
];

const STEPS = [
  { n: "1", t: "Choose a Gift Code", d: "Pick a brand and denomination that suits you." },
  { n: "2", t: "Complete Payment", d: "Secure checkout powered by Razorpay." },
  { n: "3", t: "Payment Verified", d: "Our servers verify the payment instantly." },
  { n: "4", t: "Team Processes It", d: "Every paid order is reviewed and processed securely." },
  { n: "5", t: "Email Delivery", d: "Your code is emailed to your registered address, usually within 5 minutes." },
];

export default async function GiftCardsHomePage({
  searchParams,
}: {
  searchParams: { q?: string; category?: string; brand?: string; sort?: string; page?: string; inStock?: string };
}) {
  const page = searchParams.page ?? "1";
  const sort = searchParams.sort ?? "relevance";

  const query = new URLSearchParams({ page, limit: "12", sort });
  if (searchParams.q) query.set("search", searchParams.q);
  if (searchParams.category) query.set("category", searchParams.category);
  if (searchParams.brand) query.set("brand", searchParams.brand);
  if (searchParams.inStock === "true") query.set("inStockOnly", "true");

  const [products, categories, brands, banners] = await Promise.all([
    serverApi<ProductsPayload>(`/api/gift/products?${query.toString()}`).catch(() => null),
    serverApi<{ categories: GiftCategory[] }>("/api/gift/categories").catch(() => null),
    serverApi<{ brands: GiftBrand[] }>("/api/gift/brands").catch(() => null),
    serverApi<{ banners: GiftBanner[] }>("/api/gift/banners").catch(() => null),
  ]);

  const hero = banners?.banners?.[0] ?? null;
  const hasFilters = Boolean(searchParams.q || searchParams.category || searchParams.brand || searchParams.inStock === "true");
  const pager = products?.pagination;

  const linkFor = (overrides: Record<string, string | undefined>) => {
    const merged = { ...searchParams, ...overrides };
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v) sp.set(k, v);
    const qs = sp.toString();
    return `/gift-cards${qs ? `?${qs}` : ""}`;
  };

  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-600 text-white">
        <div className="container-page grid gap-8 py-14 lg:grid-cols-2 lg:py-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
              🎁 Gift Codes Mode
            </span>
            <h1 className="mt-4 text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">
              {hero?.title ?? "Gift Cards & Codes, delivered securely"}
            </h1>
            <p className="mt-4 max-w-xl text-emerald-50">
              {hero?.subtitle ??
                "Gaming, shopping, OTT, software and recharge codes. Pay with Razorpay — our team emails your code to your registered address, usually within 5 minutes."}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="#catalog" className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50">
                Browse gift cards
              </Link>
              <Link href="/gift-cards/vault" className="rounded-lg border border-white/40 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10">
                My gift codes
              </Link>
            </div>
            <p className="mt-4 text-xs text-emerald-100">
              Gift code purchases are non-refundable · Codes are emailed manually after payment verification
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 self-center">
            {(products?.products ?? []).slice(0, 4).map((p) => (
              <div key={p.id} className="rounded-xl bg-white/10 p-4 backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100">{p.brandName}</p>
                <p className="mt-1 line-clamp-2 text-sm font-bold">{p.name}</p>
                <p className="mt-2 text-lg font-extrabold">{inr(p.sellingPrice)}</p>
                <Link href={`/gift-cards/${p.slug}`} className="mt-2 inline-block text-xs font-semibold text-white underline">
                  View →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>


      <section id="catalog" className="container-page py-10">
        <form action="/gift-cards" method="GET" className="card flex flex-wrap items-end gap-3 p-4">
          <div className="min-w-[220px] flex-1">
            <label className="label" htmlFor="gift-q">Search gift codes</label>
            <input id="gift-q" name="q" defaultValue={searchParams.q ?? ""} className="input" placeholder="Amazon, Steam, Netflix, ₹500…" />
          </div>
          <div>
            <label className="label" htmlFor="gift-cat">Category</label>
            <select id="gift-cat" name="category" defaultValue={searchParams.category ?? ""} className="input">
              <option value="">All categories</option>
              {(categories?.categories ?? []).map((c) => (
                <option key={c.id} value={c.slug}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="gift-brand">Brand</label>
            <select id="gift-brand" name="brand" defaultValue={searchParams.brand ?? ""} className="input">
              <option value="">All brands</option>
              {(brands?.brands ?? []).map((b) => (
                <option key={b.brand} value={b.brand}>{b.brand}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="gift-sort">Sort</label>
            <select id="gift-sort" name="sort" defaultValue={sort} className="input">
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm text-gray-600">
            <input type="checkbox" name="inStock" value="true" defaultChecked={searchParams.inStock === "true"} />
            In stock only
          </label>
          <button type="submit" className="btn-primary">Search</button>
          {hasFilters && <Link href="/gift-cards" className="btn-secondary">Reset</Link>}
        </form>

        {(categories?.categories ?? []).length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              href={linkFor({ category: undefined, page: undefined })}
              className={`badge ${!searchParams.category ? "bg-emerald-600 text-white" : "bg-white text-gray-600 ring-1 ring-gray-200"}`}
            >
              All
            </Link>
            {(categories?.categories ?? []).map((c) => (
              <Link
                key={c.id}
                href={linkFor({ category: c.slug, page: undefined })}
                className={`badge ${searchParams.category === c.slug ? "bg-emerald-600 text-white" : "bg-white text-gray-600 ring-1 ring-gray-200"}`}
              >
                {c.icon ? `${c.icon} ` : ""}{c.name}
                {typeof c._count?.products === "number" && <span className="ml-1 text-[10px] opacity-70">{c._count.products}</span>}
              </Link>
            ))}
          </div>
        )}

        <div className="mt-8">
          <h2 className="text-xl font-bold text-gray-900">
            {searchParams.q ? `Results for “${searchParams.q}”` : "All gift codes"}
          </h2>
          {pager && <p className="text-sm text-gray-500">{pager.total} gift code{pager.total === 1 ? "" : "s"} available</p>}
        </div>

        <div className="mt-5">
          <GiftProductGrid products={products?.products ?? []} />
        </div>

        {pager && pager.totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-3 text-sm">
            <Link
              href={linkFor({ page: String(Math.max(1, pager.page - 1)) })}
              className={`btn-secondary ${pager.page <= 1 ? "pointer-events-none opacity-40" : ""}`}
            >
              ← Previous
            </Link>
            <span className="text-gray-500">Page {pager.page} of {pager.totalPages}</span>
            <Link
              href={linkFor({ page: String(Math.min(pager.totalPages, pager.page + 1)) })}
              className={`btn-secondary ${pager.page >= pager.totalPages ? "pointer-events-none opacity-40" : ""}`}
            >
              Next →
            </Link>
          </div>
        )}
      </section>

      {(brands?.brands ?? []).length > 0 && (
        <section className="border-t border-gray-100 bg-white py-10">
          <div className="container-page">
            <h2 className="text-xl font-bold text-gray-900">Popular brands</h2>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {(brands?.brands ?? []).slice(0, 12).map((b) => (
                <Link
                  key={b.brand}
                  href={linkFor({ brand: b.brand, page: undefined })}
                  className="card flex items-center justify-between p-3 text-sm font-semibold text-gray-800 hover:border-emerald-300"
                >
                  {b.brand}
                  <span className="text-xs text-gray-400">{b.productCount}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="border-t border-gray-100 bg-emerald-50/40 py-12">
        <div className="container-page">
          <h2 className="text-2xl font-bold text-gray-900">How it works</h2>
          <p className="mt-1 text-sm text-gray-600">Pay → payment verified → team processes → code emailed to you.</p>
          <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {STEPS.map((s) => (
              <li key={s.n} className="card p-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                  {s.n}
                </span>
                <p className="mt-3 font-bold text-gray-900">{s.t}</p>
                <p className="mt-1 text-xs text-gray-600">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Trust */}
      <section className="border-t border-gray-100 bg-white py-12">
        <div className="container-page grid gap-5 sm:grid-cols-3">
          <div className="card p-5">
            <p className="text-2xl">🔒</p>
            <h3 className="mt-2 font-bold text-gray-900">Secure payments</h3>
            <p className="mt-1 text-sm text-gray-600">Powered by Razorpay. Payments are verified server-side — never from the browser.</p>
          </div>
          <div className="card p-5">
            <p className="text-2xl">✅</p>
            <h3 className="mt-2 font-bold text-gray-900">Manual code verification</h3>
            <p className="mt-1 text-sm text-gray-600">Every paid order is reviewed by our team and processed securely.</p>
          </div>
          <div className="card p-5">
            <p className="text-2xl">📧</p>
            <h3 className="mt-2 font-bold text-gray-900">Email delivery</h3>
            <p className="mt-1 text-sm text-gray-600">
              Your code is sent to your registered email — usually within 5 minutes. Codes are never shown on the website.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-gray-100 bg-gray-50 py-12">
        <div className="container-page max-w-3xl">
          <h2 className="text-2xl font-bold text-gray-900">Frequently asked questions</h2>
          <div className="mt-5 space-y-3">
            {[
              { q: "Is the code delivered instantly?", a: "Payments are verified instantly, then our team processes your order. Your code is emailed to your registered address, usually within about 5 minutes." },
              { q: "Why is delivery manual?", a: "Gift codes are high-value inventory. Manual verification protects you from double-issued or invalid codes." },
              { q: "Can I get a refund?", a: "Gift code purchases are non-refundable. Please double-check the brand, denomination and quantity before paying." },
              { q: "Where will the code be sent?", a: "To the email address on your account at purchase time — we store an email snapshot on the order." },
            ].map((f) => (
              <details key={f.q} className="card p-4">
                <summary className="cursor-pointer font-semibold text-gray-900">{f.q}</summary>
                <p className="mt-2 text-sm text-gray-600">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}


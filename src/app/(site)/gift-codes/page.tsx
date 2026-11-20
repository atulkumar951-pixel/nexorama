import { db } from "@/db";
import { giftProducts, giftCodes, giftCategories } from "@/db/schema";
import { and, eq, sql, desc } from "drizzle-orm";
import Link from "next/link";
import { getMarketplaceMode } from "@/lib/marketplace-mode";
import { redirect } from "next/navigation";
import { formatINR } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Gift Codes & Gaming Vouchers | Nexora",
  description:
    "Buy official gift cards for Steam, Google Play, Amazon Pay, Netflix & 50+ brands. 100% genuine codes with instant digital delivery upon payment.",
};

const POPULAR_BRANDS = [
  { name: "Steam", icon: "🎮", tag: "Gaming Wallet" },
  { name: "Google Play", icon: "📱", tag: "Play Store" },
  { name: "Amazon", icon: "🛍️", tag: "Shopping & Pay" },
  { name: "Netflix", icon: "🎬", tag: "OTT & Movies" },
  { name: "Spotify", icon: "🎧", tag: "Music Premium" },
  { name: "PlayStation", icon: "🕹️", tag: "PSN Credits" },
  { name: "Xbox", icon: "🟢", tag: "Xbox Game Pass" },
  { name: "Flipkart", icon: "📦", tag: "Voucher" },
  { name: "Swiggy", icon: "🍔", tag: "Food & Grocery" },
  { name: "Zomato", icon: "🍕", tag: "Dining & Food" },
];

const FAQS = [
  {
    q: "How will I receive my gift code?",
    a: "Immediately upon successful payment, your encrypted digital voucher code is dispatched directly to your registered email address. You can also view your live order status in the 'My Gift Codes' dashboard.",
  },
  {
    q: "How fast is the delivery?",
    a: "Instant! As soon as payment is confirmed, your voucher code is delivered directly to your screen and registered email address.",
  },
  {
    q: "Are these codes official and genuine?",
    a: "Yes, 100%! All codes sold on Nexora are procured directly through official authorized distributor networks. Every code carries a 100% redemption guarantee.",
  },
  {
    q: "What payment methods are supported?",
    a: "We support instant UPI (GPay, PhonePe, Paytm), Credit Cards, Debit Cards, and NetBanking through our 256-bit encrypted Razorpay payment gateway with zero convenience fees.",
  },
  {
    q: "What is the return/refund policy?",
    a: "Digital gift codes are single-use credentials delivered instantly upon payment. If you experience any issues, our 24/7 support desk is available to assist immediately.",
  },
];

export default async function GiftCodesStorefrontPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const mode = await getMarketplaceMode();
  if (mode !== "GIFT_CODES") redirect("/");

  const { q, category } = await searchParams;

  // Load active categories
  let cats: any[] = [];
  let allProducts: any[] = [];

  try {
    cats = await db
      .select()
      .from(giftCategories)
      .where(eq(giftCategories.status, "ACTIVE"))
      .orderBy(giftCategories.sortOrder, giftCategories.name);

    allProducts = await db
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
      .orderBy(desc(giftProducts.isFeatured), giftProducts.sortOrder, giftProducts.name);
  } catch (err: any) {
    console.error("GiftCodesStorefrontPage: Failed to query gift codes data:", err?.message || err);
  }

  // Filter products
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
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-emerald-500 selection:text-white">
      {/* 1. Top Live Announcement Ticker (Gyftr / E2Z Style) */}
      <div className="border-b border-emerald-100 bg-emerald-50/70 px-4 py-2 text-center text-xs font-semibold text-emerald-900">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-3 overflow-hidden">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <p className="truncate">
            <span className="font-extrabold text-emerald-800">⚡ FLASH OFFERS:</span> Instant automated email delivery on Steam, Google Play, Amazon &amp; Netflix codes |{" "}
            <span className="text-emerald-700">Average delivery time: 2.8 mins</span> | 100% Genuine Guaranteed
          </p>
        </div>
      </div>

      {/* 2. Hero Section (Light Mode Two-Column Layout Plotted with Hero Image as in eBooks Platform) */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white via-emerald-50/30 to-slate-50 border-b border-slate-200/80 text-slate-900">
        {/* Subtle ambient radial gradient */}
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.10),rgba(255,255,255,0))]"
          aria-hidden
        />

        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:py-12">
          <div className="grid items-center gap-8 lg:grid-cols-12">
            {/* Left Content Column */}
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/80 px-3 py-1 text-xs font-bold text-emerald-800 shadow-xs backdrop-blur-sm">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>⚡ 100% Genuine Brand Codes · Instant Delivery Upon Payment</span>
              </div>

              <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-[2.75rem] leading-[1.15] text-slate-900">
                Official Gift Cards &amp;{" "}
                <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
                  Gaming Vouchers
                </span>
              </h1>

              <p className="mt-3 text-sm sm:text-base leading-relaxed text-slate-600 max-w-xl">
                Steam Wallet, Google Play, PlayStation, Amazon Pay, Netflix &amp; 50+ top brands. Zero convenience fees, discounted rates, and guaranteed automated email delivery.
              </p>

              {/* Search Bar */}
              <form
                action="/gift-codes"
                className="mt-5 flex max-w-xl items-center gap-2 rounded-2xl border border-slate-300 bg-white p-1.5 shadow-md shadow-emerald-100/50 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-200 transition"
              >
                <span className="pl-3 text-base text-slate-400">🔍</span>
                <input
                  type="search"
                  name="q"
                  defaultValue={q}
                  placeholder="Search PlayStation, Steam, Amazon, Google Play, Netflix…"
                  className="w-full bg-transparent px-2 py-1.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
                  aria-label="Search gift cards"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2 text-sm font-bold text-white shadow-md shadow-emerald-200 hover:from-emerald-500 hover:to-teal-500 transition active:scale-95 whitespace-nowrap"
                >
                  Find Codes
                </button>
              </form>

              {/* Quick Search Chips */}
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-semibold text-slate-600">Popular:</span>
                {["PlayStation", "Steam", "Amazon", "Google Play", "Netflix", "Spotify", "Swiggy"].map((brand) => (
                  <Link
                    key={brand}
                    href={`/gift-codes?q=${encodeURIComponent(brand)}`}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-700 hover:border-emerald-400 hover:text-emerald-700 shadow-xs transition font-medium"
                  >
                    {brand}
                  </Link>
                ))}
              </div>

              {/* Trust badges */}
              <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-4 text-xs text-slate-600">
                <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 shadow-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="font-semibold text-slate-700">⚡ Instant Delivery Upon Payment</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 shadow-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
                  <span className="font-semibold text-slate-700">100% Genuine Brand Codes</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 shadow-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  <span className="font-semibold text-slate-700">Verified Razorpay UPI</span>
                </div>
              </div>
            </div>

            {/* Right Image Column (Identical Showcase Card Layout from eBooks Platform) */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                {/* Ambient back light */}
                <div className="absolute -inset-2 rounded-3xl bg-gradient-to-tr from-emerald-200 via-teal-200 to-amber-200 opacity-60 blur-2xl transition duration-500 hover:opacity-80" />

                {/* Showcase card */}
                <div className="group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-2.5 shadow-xl shadow-emerald-100/60 transition duration-300 hover:border-emerald-300 hover:shadow-2xl hover:shadow-emerald-200/50">
                  <div className="relative overflow-hidden rounded-xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/logo-gift.png"
                      alt="Nexora Official Gift Cards & Gaming Vouchers"
                      className="aspect-[1/1] sm:aspect-[16/10] w-full object-cover transition duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />

                    {/* Top floating badge */}
                    <div className="absolute top-3 right-3 rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold text-emerald-800 backdrop-blur-md border border-slate-200/80 shadow-xs flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Instant Voucher Dispatch</span>
                    </div>

                    {/* Bottom frosted bar */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-xl bg-white/95 px-3.5 py-2.5 backdrop-blur-md border border-slate-200/80 shadow-md">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                          Nexora Gift Cards Hub
                        </p>
                        <p className="text-xs font-semibold text-slate-800">
                          100% Genuine · Instant Delivery
                        </p>
                      </div>
                      <span className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs">
                        Verified SLA
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Popular Brands Quick-Select Carousel (Light Style) */}
      <section className="border-b border-slate-200/80 bg-white py-3 sm:py-4">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              ⭐ Top Brands &amp; Gaming Currency
            </p>
            <span className="text-xs font-semibold text-emerald-700">Official Distributor Stock</span>
          </div>
          <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 scrollbar-none">
            {POPULAR_BRANDS.map((b) => (
              <Link
                key={b.name}
                href={`/gift-codes?q=${encodeURIComponent(b.name)}`}
                className="group flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2 shadow-xs hover:border-emerald-400 hover:bg-white hover:shadow-md transition"
              >
                <span className="text-lg group-hover:scale-110 transition">{b.icon}</span>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition">
                    {b.name}
                  </p>
                  <p className="text-[10px] text-slate-500">{b.tag}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 4. 3-Step "How It Works" Infographic Banner */}
      <section id="how-it-works" className="border-b border-slate-200/80 bg-slate-50 py-4 sm:py-6">
        <div className="mx-auto max-w-7xl px-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs">
            <div className="text-center sm:text-left mb-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
                Simple 3-Step Process
              </span>
              <h2 className="text-lg font-extrabold text-slate-900 sm:text-xl">How Code Delivery Works</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-lg font-black text-emerald-700 border border-emerald-200">
                  1
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-xs sm:text-sm">Select Product &amp; Amount</h3>
                  <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">
                    Pick your brand voucher and denomination at discounted rates.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-100 text-lg font-black text-cyan-700 border border-cyan-200">
                  2
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-xs sm:text-sm">Pay Safely via Razorpay</h3>
                  <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">
                    Fast 1-click checkout using UPI, NetBanking, or Cards.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-lg font-black text-amber-700 border border-amber-200">
                  3
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-xs sm:text-sm">Instant Delivery</h3>
                  <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">
                    Code delivered straight to your screen &amp; registered email.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Main Catalog & Filters */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
        {/* Categories Tab Bar */}
        {cats.length > 0 && (
          <div className="mb-5 flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
            <Link
              href="/gift-codes"
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                !category
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
              }`}
            >
              🏷️ All Vouchers ({allProducts.length})
            </Link>
            {cats.map((c) => (
              <Link
                key={c.id}
                href={`/gift-codes?category=${c.slug}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                  category === c.slug
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "border border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
                }`}
              >
                {c.icon} {c.name}
              </Link>
            ))}
          </div>
        )}

        {/* Search / Filter Context Active Indicator */}
        {(q || category) && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-600 shadow-xs">
            <div>
              Showing <span className="font-bold text-slate-900">{all.length}</span> voucher{all.length !== 1 ? "s" : ""}
              {q && <> matching &ldquo;<span className="text-emerald-700 font-bold">{q}</span>&rdquo;</>}
              {category && <> in category &ldquo;<span className="text-emerald-700 font-bold">{cats.find((c) => c.slug === category)?.name ?? category}</span>&rdquo;</>}
            </div>
            <Link
              href="/gift-codes"
              className="rounded-lg bg-slate-100 px-3 py-1 font-semibold text-slate-700 hover:bg-slate-200 transition"
            >
              Clear filters ✕
            </Link>
          </div>
        )}

        {/* 6. Featured Products Section */}
        {featured.length > 0 && !q && !category && (
          <section className="mb-14">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                  <span className="text-amber-500">⭐</span> Top Bestselling Vouchers
                </h2>
                <p className="mt-1 text-xs text-slate-500">Most purchased gaming and lifestyle gift cards this week</p>
              </div>
              <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
                Trending High
              </span>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((p) => (
                <GiftProductCard key={p.id} product={p} featured />
              ))}
            </div>
          </section>
        )}

        {/* 7. All Products Grid */}
        <section>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-black text-slate-900">
              {q || category ? "Filtered Vouchers" : "All Available Gift Cards"}
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              {all.length} product{all.length === 1 ? "" : "s"} listed
            </span>
          </div>

          {all.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white py-20 text-center shadow-xs">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-bold text-slate-900">No gift vouchers found</h3>
              <p className="mt-2 text-xs text-slate-500 max-w-sm">
                We couldn&apos;t find any gift vouchers matching &ldquo;{q ?? category}&rdquo;. Try another brand or clear filters.
              </p>
              <Link
                href="/gift-codes"
                className="mt-6 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-md shadow-emerald-200 transition"
              >
                Browse All Gift Codes
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {all.map((p) => (
                <GiftProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </section>

        {/* 8. Trust Pillars (Gyftr & Rooter Customer Assurance) */}
        <section className="mt-10 sm:mt-12 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-8">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
              Why Customers Trust Nexora
            </span>
            <h2 className="mt-1.5 text-xl font-black text-slate-900 sm:text-2xl">
              Engineered for Speed &amp; Security
            </h2>
            <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
              We eliminate the friction of digital gifting with instant automated code delivery and verified distributor codes.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6 hover:border-emerald-300 hover:bg-white hover:shadow-md transition">
              <span className="text-3xl">⚡</span>
              <h3 className="mt-3 font-bold text-slate-900 text-sm">Instant Delivery Guarantee</h3>
              <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                Codes are delivered immediately to your screen and email upon verified payment completion.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6 hover:border-cyan-300 hover:bg-white hover:shadow-md transition">
              <span className="text-3xl">🛡️</span>
              <h3 className="mt-3 font-bold text-slate-900 text-sm">100% Genuine Distributor Codes</h3>
              <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                Direct procurement from authorized channels. Guaranteed valid, unredeemed, and covered by brand warranty.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6 hover:border-amber-300 hover:bg-white hover:shadow-md transition">
              <span className="text-3xl">🔒</span>
              <h3 className="mt-3 font-bold text-slate-900 text-sm">AES-256 Encrypted Security</h3>
              <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                Voucher codes are stored with bank-grade encryption and revealed strictly to the authenticated buyer.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6 hover:border-violet-300 hover:bg-white hover:shadow-md transition">
              <span className="text-3xl">🎧</span>
              <h3 className="mt-3 font-bold text-slate-900 text-sm">24/7 Human Ops Support</h3>
              <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                Have questions about redemption? Our dedicated operations desk assists with order tracking in minutes.
              </p>
            </div>
          </div>
        </section>

        {/* 9. Verified Customer Reviews & Social Proof */}
        <section className="mt-16">
          <div className="text-center mb-8">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
              Real Gamer &amp; Shopper Reviews
            </span>
            <h2 className="mt-1 text-2xl font-black text-slate-900">What Our Customers Say</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs hover:shadow-md transition">
              <div className="flex items-center gap-1 text-amber-500 text-sm">★★★★★</div>
              <p className="mt-3 text-xs text-slate-700 leading-relaxed">
                &ldquo;Got my Steam ₹1,000 wallet code in literally 2 minutes on my Gmail. Redeemed instantly on my Steam client. Best prices online!&rdquo;
              </p>
              <div className="mt-4 flex items-center gap-2.5 border-t border-slate-100 pt-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">
                  AS
                </span>
                <div>
                  <p className="text-xs font-bold text-slate-900">Aman Sharma</p>
                  <p className="text-[10px] text-emerald-700 font-semibold">Verified Gamer · Steam Wallet</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs hover:shadow-md transition">
              <div className="flex items-center gap-1 text-amber-500 text-sm">★★★★★</div>
              <p className="mt-3 text-xs text-slate-700 leading-relaxed">
                &ldquo;Cheapest Amazon Pay vouchers with instant UPI checkout. Received receipt and code in under 3 minutes. Will definitely buy again.&rdquo;
              </p>
              <div className="mt-4 flex items-center gap-2.5 border-t border-slate-100 pt-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-100 text-xs font-bold text-cyan-800">
                  RK
                </span>
                <div>
                  <p className="text-xs font-bold text-slate-900">Rohit Kumar</p>
                  <p className="text-[10px] text-cyan-700 font-semibold">Verified Buyer · Amazon Pay</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs hover:shadow-md transition">
              <div className="flex items-center gap-1 text-amber-500 text-sm">★★★★★</div>
              <p className="mt-3 text-xs text-slate-700 leading-relaxed">
                &ldquo;Was skeptical initially, but the Google Play code worked immediately for my BGMI UC recharge. Outstanding service and instant SLA!&rdquo;
              </p>
              <div className="mt-4 flex items-center gap-2.5 border-t border-slate-100 pt-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-800">
                  DP
                </span>
                <div>
                  <p className="text-xs font-bold text-slate-900">Dev Patel</p>
                  <p className="text-[10px] text-violet-700 font-semibold">Verified Gamer · Google Play</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 10. Frequently Asked Questions (FAQ) */}
        <section className="mt-20 border-t border-slate-200 pt-16">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Got Questions?</span>
            <h2 className="mt-1 text-2xl font-black text-slate-900">Frequently Asked Questions</h2>
          </div>
          <div className="mx-auto max-w-3xl divide-y divide-slate-200 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
            {FAQS.map((faq, idx) => (
              <details key={idx} className="group py-4 first:pt-0 last:pb-0">
                <summary className="flex cursor-pointer items-center justify-between text-sm font-bold text-slate-900 hover:text-emerald-700 transition list-none">
                  <span>{faq.q}</span>
                  <span className="text-emerald-600 transition group-open:rotate-180">▼</span>
                </summary>
                <p className="mt-3 text-xs leading-relaxed text-slate-600">{faq.a}</p>
              </details>
            ))}
          </div>
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
  const isLowStock = inStock && p.available <= 5;

  return (
    <Link
      href={`/gift-codes/${p.slug}`}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-white transition duration-300 hover:-translate-y-1 hover:shadow-xl ${
        featured
          ? "border-amber-300 hover:border-amber-400 hover:shadow-amber-100"
          : "border-slate-200/90 hover:border-emerald-300 hover:shadow-emerald-50"
      }`}
    >
      {/* Product Image / Card Art */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-100 via-slate-50 to-emerald-50/40 h-44 flex items-center justify-center p-3">
        {p.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.image}
            alt={`${p.brandName} ${p.name}`}
            className="h-full w-full rounded-xl object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-center">
            <span className="text-5xl group-hover:scale-110 transition duration-300">🎁</span>
            <p className="mt-2 text-xs font-black uppercase tracking-wider text-emerald-700">{p.brandName}</p>
          </div>
        )}

        {/* Top Floating Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
          {featured && (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-400 px-2 py-0.5 text-[10px] font-extrabold text-slate-900 shadow-xs">
              ⭐ BESTSELLER
            </span>
          )}
          {discount > 0 && (
            <span className="inline-flex items-center rounded-md bg-red-600 px-2 py-0.5 text-[10px] font-extrabold text-white shadow-xs">
              SAVE {discount}%
            </span>
          )}
        </div>

        {/* Live Stock Overlay */}
        <div className="absolute top-2.5 right-2.5">
          {inStock ? (
            isLowStock ? (
              <span className="rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-extrabold text-amber-800 shadow-xs">
                ⚡ Only {p.available} Left
              </span>
            ) : (
              <span className="rounded-md border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800 shadow-xs">
                🟢 Ready
              </span>
            )
          ) : (
            <span className="rounded-md border border-red-300 bg-red-50 px-2 py-0.5 text-[10px] font-extrabold text-red-700 shadow-xs">
              🔴 Sold Out
            </span>
          )}
        </div>

        {/* Out of Stock Grayscale Overlay */}
        {!inStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs">
            <span className="rounded-xl border border-red-200 bg-white/95 px-4 py-1.5 text-xs font-extrabold text-red-700 shadow-sm">
              OUT OF STOCK
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4 bg-white">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">{p.brandName}</p>
          <span className="text-[10px] font-mono text-slate-400">Value: {formatINR(p.denomination)}</span>
        </div>

        <h3 className="mt-1 font-bold text-slate-900 text-sm line-clamp-2 group-hover:text-emerald-700 transition">
          {p.name}
        </h3>

        {/* Price & Savings */}
        <div className="mt-auto pt-4 flex items-end justify-between border-t border-slate-100">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-slate-900">{formatINR(p.sellingPrice)}</span>
              {discount > 0 && (
                <span className="text-xs text-slate-400 line-through">{formatINR(p.denomination)}</span>
              )}
            </div>
            {discount > 0 && (
              <p className="text-[10px] font-semibold text-emerald-600">
                You save {formatINR(p.denomination - p.sellingPrice)}
              </p>
            )}
          </div>

          <span
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition flex items-center gap-1 ${
              inStock
                ? "bg-emerald-600 text-white group-hover:bg-emerald-700 shadow-sm shadow-emerald-200"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            }`}
          >
            <span>{inStock ? "Buy Now" : "Notify"}</span>
            <span className="text-xs">→</span>
          </span>
        </div>
      </div>
    </Link>
  );
}

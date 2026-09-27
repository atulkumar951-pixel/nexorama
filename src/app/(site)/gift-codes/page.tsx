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
    "Buy official gift cards for Steam, Google Play, Amazon Pay, Netflix & 50+ brands. 100% genuine codes with instant email delivery in under 5 minutes.",
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
    a: "Our target SLA is under 5 minutes! Over 99% of our orders are fulfilled within 2 to 3 minutes. If your code is delayed, our 24/7 ops desk is available to assist immediately.",
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
    a: "Because digital gift codes are single-use credentials that cannot be un-seen once delivered, gift code orders are strictly non-refundable once delivered, in accordance with brand policy.",
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
  const cats = await db
    .select()
    .from(giftCategories)
    .where(eq(giftCategories.status, "ACTIVE"))
    .orderBy(giftCategories.sortOrder, giftCategories.name);

  // Query published products with stock count
  const allProducts = await db
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
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-white">
      {/* 1. Top Live Announcement Ticker (Gyftr / Rooter Style) */}
      <div className="border-b border-emerald-500/20 bg-emerald-950/40 px-4 py-2 text-center text-xs font-medium text-emerald-300">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-3 overflow-hidden">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <p className="truncate">
            <span className="font-bold text-white">⚡ FLASH OFFERS:</span> Instant automated email delivery on Steam, Google Play, Amazon &amp; Netflix codes |{" "}
            <span className="text-emerald-200">Average delivery time: 2.8 mins</span> | 100% Genuine Guaranteed
          </p>
        </div>
      </div>

      {/* 2. Hero Section (Cyber / Modern Gamer & Voucher Portal Vibe) */}
      <section className="relative overflow-hidden border-b border-slate-800 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-16 sm:py-24">
        {/* Radiant Ambient Neon Glows */}
        <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="pointer-events-none absolute top-1/2 right-10 -z-10 h-72 w-72 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-10 -z-10 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="mx-auto max-w-7xl px-4">
          <div className="mx-auto max-w-3xl text-center">
            {/* Top Verified Pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/60 px-4 py-1.5 text-xs font-bold text-emerald-400 backdrop-blur-md shadow-lg shadow-emerald-950/50 mb-6">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <span>100% GENUINE CODES · INSTANT EMAIL DELIVERY &lt; 5 MINS</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl font-black tracking-tight sm:text-6xl sm:leading-[1.15] text-white">
              Official Gift Cards &amp;{" "}
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                Gaming Vouchers
              </span>
            </h1>

            <p className="mt-5 text-base sm:text-lg leading-relaxed text-slate-400">
              Steam Wallet, Google Play, Amazon Pay, Netflix, Spotify &amp; 50+ top brands. Zero convenience fees, discounted rates, and guaranteed automated email delivery.
            </p>

            {/* Gyftr / E2Z Search Bar */}
            <form action="/gift-codes" className="mt-8 mx-auto flex max-w-xl items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/90 p-2 shadow-2xl shadow-emerald-950/30 backdrop-blur-md focus-within:border-emerald-500 transition">
              <span className="pl-3 text-lg text-slate-400">🔍</span>
              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Search Amazon, Steam, Google Play, Netflix, Spotify…"
                className="w-full bg-transparent px-2 py-2 text-sm text-white placeholder-slate-500 focus:outline-none"
                aria-label="Search gift cards"
              />
              <button
                type="submit"
                className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 text-sm font-bold text-slate-950 hover:from-emerald-400 hover:to-teal-400 shadow-md shadow-emerald-500/20 transition active:scale-95 whitespace-nowrap"
              >
                Find Codes
              </button>
            </form>

            {/* Quick Search Chips */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400">
              <span className="font-semibold text-slate-500">Popular:</span>
              {["Steam", "Amazon", "Google Play", "Netflix", "Spotify", "Swiggy"].map((brand) => (
                <Link
                  key={brand}
                  href={`/gift-codes?q=${encodeURIComponent(brand)}`}
                  className="rounded-full border border-slate-800 bg-slate-900/80 px-2.5 py-1 text-slate-300 hover:border-emerald-500 hover:text-emerald-400 transition"
                >
                  {brand}
                </Link>
              ))}
            </div>

            {/* Social Proof Counter Bar (Rooter & E2Z Style) */}
            <div className="mt-12 grid grid-cols-2 gap-4 border-t border-slate-800/80 pt-8 sm:grid-cols-4">
              <div className="flex flex-col items-center">
                <span className="text-2xl font-black text-white sm:text-3xl">10M+</span>
                <span className="text-xs text-slate-400 font-medium">Vouchers Delivered</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-black text-emerald-400 sm:text-3xl">&lt; 5 Mins</span>
                <span className="text-xs text-slate-400 font-medium">Delivery SLA Guarantee</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-black text-amber-400 sm:text-3xl">4.9 ★</span>
                <span className="text-xs text-slate-400 font-medium">15K+ Verified Reviews</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-black text-cyan-400 sm:text-3xl">100%</span>
                <span className="text-xs text-slate-400 font-medium">Genuine Brand Warranty</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Popular Brands Quick-Select Carousel (Gyftr Style) */}
      <section className="border-b border-slate-800/80 bg-slate-900/50 py-6">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              ⭐ Top Brands &amp; Gaming Currency
            </p>
            <span className="text-xs text-emerald-400">Official Distributor Stock</span>
          </div>
          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
            {POPULAR_BRANDS.map((b) => (
              <Link
                key={b.name}
                href={`/gift-codes?q=${encodeURIComponent(b.name)}`}
                className="group flex shrink-0 items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 shadow-sm hover:border-emerald-500/50 hover:bg-slate-850 hover:shadow-emerald-950/40 transition"
              >
                <span className="text-xl group-hover:scale-110 transition">{b.icon}</span>
                <div className="text-left">
                  <p className="text-xs font-bold text-white group-hover:text-emerald-400 transition">{b.name}</p>
                  <p className="text-[10px] text-slate-400">{b.tag}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 4. 3-Step "How It Works" Infographic Banner */}
      <section id="how-it-works" className="border-b border-slate-800/80 bg-slate-950 py-10">
        <div className="mx-auto max-w-7xl px-4">
          <div className="rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/80 to-slate-900 p-6 sm:p-8 shadow-xl">
            <div className="text-center sm:text-left mb-6">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Simple 3-Step Process</span>
              <h2 className="text-xl font-extrabold text-white sm:text-2xl">How Code Delivery Works</h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-3">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-2xl font-black text-emerald-400 border border-emerald-500/20">
                  1
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Select Product &amp; Amount</h3>
                  <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                    Pick your brand voucher and denomination (₹100 to ₹5,000) at exclusive discounted prices.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/10 text-2xl font-black text-cyan-400 border border-cyan-500/20">
                  2
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Pay Safely via Razorpay</h3>
                  <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                    Fast 1-click checkout using UPI, NetBanking, or Cards with 256-bit bank encryption.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-2xl font-black text-amber-400 border border-amber-500/20">
                  3
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Instant Email Delivery (&lt; 5m)</h3>
                  <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                    Your encrypted digital code arrives straight in your email inbox and customer dashboard.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Main Catalog & Filters */}
      <div className="mx-auto max-w-7xl px-4 py-12">
        {/* Categories Tab Bar */}
        {cats.length > 0 && (
          <div className="mb-8 flex flex-wrap items-center gap-2 border-b border-slate-800 pb-4">
            <Link
              href="/gift-codes"
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                !category
                  ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                  : "border border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700 hover:text-white"
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
                    ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                    : "border border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700 hover:text-white"
                }`}
              >
                {c.icon} {c.name}
              </Link>
            ))}
          </div>
        )}

        {/* Search / Filter Context Active Indicator */}
        {(q || category) && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-400">
            <div>
              Showing <span className="font-bold text-white">{all.length}</span> voucher{all.length !== 1 ? "s" : ""}
              {q && <> matching &ldquo;<span className="text-emerald-400 font-bold">{q}</span>&rdquo;</>}
              {category && <> in category &ldquo;<span className="text-emerald-400 font-bold">{cats.find((c) => c.slug === category)?.name ?? category}</span>&rdquo;</>}
            </div>
            <Link
              href="/gift-codes"
              className="rounded-lg bg-slate-800 px-3 py-1 font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition"
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
                <h2 className="text-2xl font-black text-white flex items-center gap-2">
                  <span className="text-amber-400">⭐</span> Top Bestselling Vouchers
                </h2>
                <p className="mt-1 text-xs text-slate-400">Most purchased gaming and lifestyle gift cards this week</p>
              </div>
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-300">
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
            <h2 className="text-2xl font-black text-white">
              {q || category ? "Filtered Vouchers" : "All Available Gift Cards"}
            </h2>
            <span className="text-xs text-slate-400 font-medium">
              {all.length} product{all.length === 1 ? "" : "s"} listed
            </span>
          </div>

          {all.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-800 bg-slate-900/40 py-20 text-center">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-bold text-white">No gift vouchers found</h3>
              <p className="mt-2 text-xs text-slate-400 max-w-sm">
                We couldn&apos;t find any gift vouchers matching &ldquo;{q ?? category}&rdquo;. Try another brand or clear filters.
              </p>
              <Link
                href="/gift-codes"
                className="mt-6 rounded-xl bg-emerald-500 px-6 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 transition"
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

        {/* 8. Trust Pillars (Rooter & E2Z Store Customer Assurance) */}
        <section className="mt-20 rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900/80 to-slate-950 p-8 sm:p-12 shadow-2xl">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Why Customers Trust Nexora</span>
            <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">Engineered for Speed &amp; Security</h2>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              We eliminate the friction of digital gifting with instant automated queue processing and verified distributor codes.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 hover:border-emerald-500/40 transition">
              <span className="text-3xl">⚡</span>
              <h3 className="mt-3 font-bold text-white text-sm">5-Minute SLA Guarantee</h3>
              <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                Automated order dispatch ensures your valid code lands directly in your email inbox in under 5 minutes.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 hover:border-cyan-500/40 transition">
              <span className="text-3xl">🛡️</span>
              <h3 className="mt-3 font-bold text-white text-sm">100% Genuine Distributor Codes</h3>
              <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                Direct procurement from authorized channels. Guaranteed valid, unredeemed, and covered by brand warranty.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 hover:border-amber-500/40 transition">
              <span className="text-3xl">🔒</span>
              <h3 className="mt-3 font-bold text-white text-sm">AES-256 Encrypted Security</h3>
              <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                Voucher codes are stored with bank-grade encryption and revealed strictly to the authenticated buyer.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 hover:border-violet-500/40 transition">
              <span className="text-3xl">🎧</span>
              <h3 className="mt-3 font-bold text-white text-sm">24/7 Human Ops Support</h3>
              <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                Have questions about redemption? Our dedicated operations desk assists with order tracking in minutes.
              </p>
            </div>
          </div>
        </section>

        {/* 9. Verified Customer Reviews & Social Proof */}
        <section className="mt-16">
          <div className="text-center mb-8">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Real Gamer &amp; Shopper Reviews</span>
            <h2 className="mt-1 text-2xl font-black text-white">What Our Customers Say</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm">
              <div className="flex items-center gap-1 text-amber-400 text-sm">★★★★★</div>
              <p className="mt-3 text-xs text-slate-300 leading-relaxed">
                &ldquo;Got my Steam ₹1,000 wallet code in literally 2 minutes on my Gmail. Redeemed instantly on my Steam client. Best prices online!&rdquo;
              </p>
              <div className="mt-4 flex items-center gap-2.5 border-t border-slate-800 pt-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-400">
                  AS
                </span>
                <div>
                  <p className="text-xs font-bold text-white">Aman Sharma</p>
                  <p className="text-[10px] text-emerald-400">Verified Gamer · Steam Wallet</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm">
              <div className="flex items-center gap-1 text-amber-400 text-sm">★★★★★</div>
              <p className="mt-3 text-xs text-slate-300 leading-relaxed">
                &ldquo;Cheapest Amazon Pay vouchers with instant UPI checkout. Received receipt and code in under 3 minutes. Will definitely buy again.&rdquo;
              </p>
              <div className="mt-4 flex items-center gap-2.5 border-t border-slate-800 pt-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/20 text-xs font-bold text-cyan-400">
                  RK
                </span>
                <div>
                  <p className="text-xs font-bold text-white">Rohit Kumar</p>
                  <p className="text-[10px] text-cyan-400">Verified Buyer · Amazon Pay</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm">
              <div className="flex items-center gap-1 text-amber-400 text-sm">★★★★★</div>
              <p className="mt-3 text-xs text-slate-300 leading-relaxed">
                &ldquo;Was skeptical initially, but the Google Play code worked immediately for my BGMI UC recharge. Outstanding service and instant SLA!&rdquo;
              </p>
              <div className="mt-4 flex items-center gap-2.5 border-t border-slate-800 pt-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/20 text-xs font-bold text-violet-400">
                  DP
                </span>
                <div>
                  <p className="text-xs font-bold text-white">Dev Patel</p>
                  <p className="text-[10px] text-violet-400">Verified Gamer · Google Play</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 10. Frequently Asked Questions (FAQ) */}
        <section className="mt-20 border-t border-slate-800/80 pt-16">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Got Questions?</span>
            <h2 className="mt-1 text-2xl font-black text-white">Frequently Asked Questions</h2>
          </div>
          <div className="mx-auto max-w-3xl divide-y divide-slate-800 rounded-3xl border border-slate-800 bg-slate-900/50 p-6 sm:p-8">
            {FAQS.map((faq, idx) => (
              <details key={idx} className="group py-4 first:pt-0 last:pb-0">
                <summary className="flex cursor-pointer items-center justify-between text-sm font-bold text-white hover:text-emerald-400 transition list-none">
                  <span>{faq.q}</span>
                  <span className="text-emerald-400 transition group-open:rotate-180">▼</span>
                </summary>
                <p className="mt-3 text-xs leading-relaxed text-slate-400">{faq.a}</p>
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
      className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-slate-900 transition duration-300 hover:-translate-y-1 hover:shadow-2xl ${
        featured
          ? "border-amber-500/30 hover:border-amber-400 hover:shadow-amber-500/10"
          : "border-slate-800 hover:border-emerald-500/40 hover:shadow-emerald-500/10"
      }`}
    >
      {/* Product Image / Card Art */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 h-44 flex items-center justify-center p-3">
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
            <p className="mt-2 text-xs font-black uppercase tracking-wider text-emerald-400">{p.brandName}</p>
          </div>
        )}

        {/* Top Floating Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
          {featured && (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-400 px-2 py-0.5 text-[10px] font-extrabold text-slate-950 shadow">
              ⭐ BESTSELLER
            </span>
          )}
          {discount > 0 && (
            <span className="inline-flex items-center rounded-md bg-red-600 px-2 py-0.5 text-[10px] font-extrabold text-white shadow">
              SAVE {discount}%
            </span>
          )}
        </div>

        {/* Live Stock Overlay */}
        <div className="absolute top-2.5 right-2.5">
          {inStock ? (
            isLowStock ? (
              <span className="rounded-md bg-amber-500/90 px-2 py-0.5 text-[10px] font-extrabold text-slate-950 shadow backdrop-blur-sm">
                ⚡ Only {p.available} Left
              </span>
            ) : (
              <span className="rounded-md bg-emerald-500/90 px-2 py-0.5 text-[10px] font-extrabold text-slate-950 shadow backdrop-blur-sm">
                🟢 Ready
              </span>
            )
          ) : (
            <span className="rounded-md bg-red-500/90 px-2 py-0.5 text-[10px] font-extrabold text-white shadow backdrop-blur-sm">
              🔴 Sold Out
            </span>
          )}
        </div>

        {/* Out of Stock Grayscale Overlay */}
        {!inStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs">
            <span className="rounded-xl border border-red-500/40 bg-red-950/80 px-4 py-1.5 text-xs font-extrabold text-red-200">
              OUT OF STOCK
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4 bg-slate-900/95">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">{p.brandName}</p>
          <span className="text-[10px] font-mono text-slate-400">Value: {formatINR(p.denomination)}</span>
        </div>

        <h3 className="mt-1 font-bold text-white text-sm line-clamp-2 group-hover:text-emerald-300 transition">
          {p.name}
        </h3>

        {/* Price & Savings */}
        <div className="mt-auto pt-4 flex items-end justify-between border-t border-slate-800">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-white">{formatINR(p.sellingPrice)}</span>
              {discount > 0 && (
                <span className="text-xs text-slate-400 line-through">{formatINR(p.denomination)}</span>
              )}
            </div>
            {discount > 0 && (
              <p className="text-[10px] font-semibold text-emerald-400">
                You save {formatINR(p.denomination - p.sellingPrice)}
              </p>
            )}
          </div>

          <span
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition flex items-center gap-1 ${
              inStock
                ? "bg-emerald-500 text-slate-950 group-hover:bg-emerald-400 shadow-md shadow-emerald-500/10"
                : "bg-slate-800 text-slate-400 cursor-not-allowed"
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

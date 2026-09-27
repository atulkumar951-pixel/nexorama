import { db } from "@/db";
import { giftProducts, giftCodes, giftCategories } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getMarketplaceMode } from "@/lib/marketplace-mode";
import { getCurrentUser } from "@/lib/auth";
import { formatINR } from "@/lib/format";
import { GiftBuyForm } from "../gift-buy-form";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const [product] = await db
    .select({ name: giftProducts.name, brandName: giftProducts.brandName, description: giftProducts.description })
    .from(giftProducts)
    .where(eq(giftProducts.slug, slug))
    .limit(1);
  if (!product) return { title: "Gift Card | Nexora" };
  return {
    title: `${product.brandName} ${product.name} | Nexora Gift Codes`,
    description: product.description ?? `Buy ${product.brandName} ${product.name} gift card. Instant digital delivery in under 5 minutes.`,
  };
}

export default async function GiftProductDetailPage({ params }: Props) {
  const mode = await getMarketplaceMode();
  if (mode !== "GIFT_CODES") redirect("/");

  const { slug } = await params;
  const user = await getCurrentUser();

  const [product] = await db
    .select()
    .from(giftProducts)
    .where(and(eq(giftProducts.slug, slug), eq(giftProducts.status, "PUBLISHED")))
    .limit(1);

  if (!product) notFound();

  // Stock count
  const [stockRow] = await db
    .select({
      total: sql<number>`count(*)::int`,
      available: sql<number>`count(*) filter (where ${giftCodes.status} = 'AVAILABLE')::int`,
    })
    .from(giftCodes)
    .where(eq(giftCodes.giftProductId, product.id));

  const available = stockRow?.available ?? 0;
  const inStock = available > 0;
  const isLowStock = inStock && available <= 5;

  // Category
  const category = product.categoryId
    ? (await db.select().from(giftCategories).where(eq(giftCategories.id, product.categoryId)).limit(1))[0]
    : null;

  const discount =
    product.denomination > product.sellingPrice
      ? Math.round(((product.denomination - product.sellingPrice) / product.denomination) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 selection:bg-emerald-500 selection:text-white">
      <div className="mx-auto max-w-7xl px-4">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-xs text-slate-400">
          <Link href="/gift-codes" className="hover:text-emerald-400 transition">Gift Codes</Link>
          {category && (
            <>
              <span>›</span>
              <Link href={`/gift-codes?category=${category.slug}`} className="hover:text-emerald-400 transition">
                {category.icon} {category.name}
              </Link>
            </>
          )}
          <span>›</span>
          <span className="text-white font-medium line-clamp-1">{product.name}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1fr_420px]">
          {/* Left: Product Media & Information */}
          <div>
            {/* Voucher Artwork Card */}
            <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-4 sm:p-8 shadow-2xl">
              <div className="relative aspect-[16/8] w-full overflow-hidden rounded-2xl bg-slate-950/80 flex items-center justify-center border border-slate-800">
                {product.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.image}
                    alt={`${product.brandName} ${product.name}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="text-center p-6">
                    <div className="text-7xl mb-2">🎁</div>
                    <p className="text-2xl font-black uppercase tracking-wider text-emerald-400">{product.brandName}</p>
                    <p className="text-xs text-slate-400">Digital Gift Voucher</p>
                  </div>
                )}

                {/* Denomination Floating Badge */}
                <div className="absolute bottom-3 right-3 rounded-2xl border border-slate-700 bg-slate-900/90 px-4 py-2 backdrop-blur-md shadow-xl text-right">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Face Value</p>
                  <p className="text-xl font-black text-emerald-400">{formatINR(product.denomination)}</p>
                </div>
              </div>
            </div>

            {/* Product Meta & Badges */}
            <div className="mt-8">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-400">
                  {product.brandName}
                </span>
                {category && (
                  <span className="rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-300">
                    {category.icon} {category.name}
                  </span>
                )}
                {discount > 0 && (
                  <span className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-bold text-white shadow">
                    SAVE {discount}%
                  </span>
                )}
                <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-xs font-bold text-cyan-400">
                  ⚡ &lt; 5 Mins Email Delivery
                </span>
              </div>

              <h1 className="mt-4 text-3xl sm:text-4xl font-black text-white">{product.name}</h1>

              {product.description && (
                <p className="mt-4 text-sm leading-relaxed text-slate-300 bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
                  {product.description}
                </p>
              )}

              {/* 3-Step Redemption Infographic */}
              <div className="mt-8">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  How Delivery &amp; Redemption Works
                </h3>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                    <div className="text-2xl">🛒</div>
                    <p className="mt-2 font-bold text-white text-xs">1. Instant Checkout</p>
                    <p className="mt-1 text-[11px] text-slate-400">Pay safely using UPI, Cards or NetBanking via Razorpay.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                    <div className="text-2xl">📧</div>
                    <p className="mt-2 font-bold text-white text-xs">2. Code Dispatched</p>
                    <p className="mt-1 text-[11px] text-slate-400">Encrypted code delivered directly to your email in &lt; 5 mins.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                    <div className="text-2xl">🎮</div>
                    <p className="mt-2 font-bold text-white text-xs">3. Redeem &amp; Enjoy</p>
                    <p className="mt-1 text-[11px] text-slate-400">Redeem code on brand app/storefront with 100% guarantee.</p>
                  </div>
                </div>
              </div>

              {/* Redemption Instructions */}
              {product.instructions && (
                <div className="mt-8 rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-6">
                  <h3 className="font-bold text-emerald-400 text-sm mb-2 flex items-center gap-2">
                    <span>📋</span> Official Redemption Instructions
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">{product.instructions}</p>
                </div>
              )}

              {/* Terms & Conditions */}
              {product.terms && (
                <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
                  <h3 className="font-bold text-slate-300 text-sm mb-2 flex items-center gap-2">
                    <span>📄</span> Voucher Terms &amp; Brand Policy
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-line">{product.terms}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Purchase & Trust Panel */}
          <div className="lg:sticky lg:top-24 self-start">
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-7 shadow-2xl">
              {/* Price Row */}
              <div className="mb-6">
                <div className="flex items-baseline gap-3">
                  <p className="text-4xl font-black text-white">{formatINR(product.sellingPrice)}</p>
                  {discount > 0 && (
                    <div>
                      <p className="text-sm text-slate-400 line-through">{formatINR(product.denomination)}</p>
                      <span className="text-xs font-bold text-emerald-400">Save {discount}%</span>
                    </div>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Denomination Value: <strong className="text-slate-200">{formatINR(product.denomination)}</strong>
                </p>
              </div>

              {/* Live Inventory Stock Badge */}
              <div
                className={`mb-6 flex items-center justify-between rounded-xl border px-4 py-2.5 text-xs font-bold ${
                  inStock
                    ? isLowStock
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border-red-500/30 bg-red-500/10 text-red-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      inStock ? (isLowStock ? "bg-amber-400 animate-ping" : "bg-emerald-400 animate-pulse") : "bg-red-400"
                    }`}
                  />
                  <span>
                    {inStock
                      ? isLowStock
                        ? `Hurry! Only ${available} codes left in inventory`
                        : "Ready for Instant Dispatch"
                      : "Temporarily Out of Stock"}
                  </span>
                </div>
                {inStock && <span className="font-mono text-[10px]">{available} available</span>}
              </div>

              {/* Buy Form / Auth Trigger */}
              {inStock ? (
                user ? (
                  <GiftBuyForm
                    product={{
                      id: product.id,
                      name: product.name,
                      brandName: product.brandName,
                      denomination: product.denomination,
                      sellingPrice: product.sellingPrice,
                    }}
                    userEmail={user.email}
                    maxQuantity={Math.min(product.purchaseLimit || 5, available)}
                  />
                ) : (
                  <div className="space-y-3">
                    <Link
                      href={`/login?next=/gift-codes/${product.slug}`}
                      className="block w-full text-center rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-400 transition duration-200"
                    >
                      Sign In to Buy Voucher
                    </Link>
                    <p className="text-center text-xs text-slate-400">
                      New to Nexora?{" "}
                      <Link href="/register" className="text-emerald-400 font-semibold hover:underline">
                        Register account
                      </Link>
                    </p>
                  </div>
                )
              ) : (
                <div className="rounded-xl border border-red-500/20 bg-red-950/30 p-4 text-center">
                  <p className="text-xs font-bold text-red-400">Inventory Sold Out</p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Restock is underway. Please check back shortly or browse other denominations.
                  </p>
                </div>
              )}

              {/* Trust Badges & Non-Refundable Guarantee Notice */}
              <div className="mt-6 space-y-3 border-t border-slate-800 pt-6 text-xs text-slate-400">
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="text-emerald-400">⚡</span>
                  <span>Instant email delivery SLA &lt; 5 minutes</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="text-cyan-400">🛡️</span>
                  <span>100% Genuine distributor code guaranteed</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="text-amber-400">🔒</span>
                  <span>Safe checkout with 256-bit encrypted Razorpay</span>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-[11px] text-slate-400 leading-relaxed">
                  <span className="font-semibold text-slate-300">⚠️ Non-Refundable:</span> Digital voucher codes are single-use credentials and cannot be cancelled or refunded once dispatched.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { db } from "@/db";
import { giftProducts, giftCodes, giftCategories } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getMarketplaceMode, getPlatformSetting } from "@/lib/marketplace-mode";
import { getCurrentUser } from "@/lib/auth";
import { formatINR } from "@/lib/format";
import { GiftBuyForm } from "../gift-buy-form";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  try {
    const [product] = await db
      .select({ name: giftProducts.name, brandName: giftProducts.brandName, description: giftProducts.description })
      .from(giftProducts)
      .where(eq(giftProducts.slug, slug))
      .limit(1);
    if (!product) return { title: "Gift Card | Nexora" };
    return {
      title: `${product.brandName} ${product.name} | Nexora Gift Codes`,
      description: product.description ?? `Buy ${product.brandName} ${product.name} gift card. Instant digital delivery upon payment.`,
    };
  } catch {
    return { title: "Gift Card | Nexora" };
  }
}

export default async function GiftProductDetailPage({ params }: Props) {
  const mode = await getMarketplaceMode();
  if (mode !== "GIFT_CODES") redirect("/");

  const { slug } = await params;
  const user = await getCurrentUser();

  let product: any = null;
  let stockRow: any = null;
  let category: any = null;

  try {
    const [p] = await db
      .select()
      .from(giftProducts)
      .where(and(eq(giftProducts.slug, slug), eq(giftProducts.status, "PUBLISHED")))
      .limit(1);
    product = p;

    if (product) {
      const [sr] = await db
        .select({
          total: sql<number>`count(*)::int`,
          available: sql<number>`count(*) filter (where ${giftCodes.status} = 'AVAILABLE')::int`,
        })
        .from(giftCodes)
        .where(eq(giftCodes.giftProductId, product.id));
      stockRow = sr;

      if (product.categoryId) {
        const [cat] = await db.select().from(giftCategories).where(eq(giftCategories.id, product.categoryId)).limit(1);
        category = cat;
      }
    }
  } catch (err: any) {
    console.error("GiftProductDetailPage: query error:", err?.message || err);
  }

  if (!product) notFound();

  const [lowStockThresholdSetting, maxQtySetting] = await Promise.all([
    getPlatformSetting("low_stock_threshold", "10"),
    getPlatformSetting("max_quantity_per_order", "10"),
  ]);

  const lowStockThreshold = Number(lowStockThresholdSetting);
  const maxQtyLimit = Number(maxQtySetting);

  const available = stockRow?.available ?? 0;
  const inStock = available > 0;
  const isLowStock = inStock && available <= lowStockThreshold;
  const effectiveMaxQty = product.purchaseLimit ? Math.min(product.purchaseLimit, maxQtyLimit) : maxQtyLimit;

  const discount =
    product.denomination > product.sellingPrice
      ? Math.round(((product.denomination - product.sellingPrice) / product.denomination) * 100)
      : 0;

  // Clean title: Avoid duplicate brand name like "Amazon Amazon ₹500"
  const cleanTitle = product.name.toLowerCase().startsWith(product.brandName.toLowerCase())
    ? product.name
    : `${product.brandName} ${product.name}`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-10 selection:bg-emerald-500 selection:text-white">
      <div className="mx-auto max-w-xl px-4">
        {/* Back Navigation */}
        <div className="mb-6">
          <Link
            href="/gift-codes"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-emerald-700 transition"
          >
            <span>←</span>
            <span>Back to Gift Codes</span>
          </Link>
        </div>

        {/* Main Card: Voucher Card & Purchase Form */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg shadow-slate-200/50">
          {/* Card Artwork */}
          <div className="relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br from-emerald-50/50 via-slate-50 to-teal-50 flex items-center justify-center border-b border-slate-100">
            {product.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.image}
                alt={cleanTitle}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="text-center p-6">
                <div className="text-6xl mb-2">🎁</div>
                <p className="text-2xl font-black uppercase tracking-wider text-emerald-700">{product.brandName}</p>
                <p className="text-xs text-slate-500">Digital Gift Voucher</p>
              </div>
            )}

            {/* Denomination Badge */}
            <div className="absolute bottom-3 right-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-1.5 backdrop-blur-md shadow-md text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Face Value</p>
              <p className="text-lg font-black text-emerald-700">{formatINR(product.denomination)}</p>
            </div>
          </div>

          {/* Card Body */}
          <div className="p-6 sm:p-8">
            {/* Header: Title & Badges */}
            <div className="mb-6">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-800">
                  {product.brandName}
                </span>
                {category && (
                  <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-700">
                    {category.name}
                  </span>
                )}
                {discount > 0 && (
                  <span className="rounded-md bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
                    SAVE {discount}%
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">{cleanTitle}</h1>
            </div>

            {/* Price & Stock Row */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-y border-slate-100 py-4">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900">{formatINR(product.sellingPrice)}</span>
                  {discount > 0 && (
                    <span className="text-xs text-slate-400 line-through">{formatINR(product.denomination)}</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Denomination Value: <strong className="text-slate-700">{formatINR(product.denomination)}</strong>
                </p>
              </div>

              {/* Stock Status */}
              <div
                className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-bold ${
                  inStock
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${inStock ? "bg-emerald-500" : "bg-red-500"}`} />
                <span>{inStock ? "In Stock · Ready to Deliver" : "Out of Stock"}</span>
              </div>
            </div>

            {/* Input Form & Pay Button */}
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
                  userName={user.name}
                  maxQuantity={Math.min(effectiveMaxQty, available > 0 ? available : effectiveMaxQty)}
                />
              ) : (
                <div className="space-y-3">
                  <Link
                    href={`/login?next=/gift-codes/${product.slug}`}
                    className="block w-full text-center rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-emerald-200 hover:from-emerald-500 hover:to-teal-500 transition duration-200"
                  >
                    Sign In to Buy Voucher
                  </Link>
                  <p className="text-center text-xs text-slate-500">
                    New to Nexora?{" "}
                    <Link href="/register" className="text-emerald-700 font-semibold hover:underline">
                      Register free
                    </Link>
                  </p>
                </div>
              )
            ) : (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
                <p className="text-xs font-bold text-red-700">Inventory Sold Out</p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Restock is underway. Please check back shortly or browse other denominations.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

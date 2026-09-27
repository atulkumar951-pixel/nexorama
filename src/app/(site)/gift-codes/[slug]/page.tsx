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
    description: product.description ?? `Buy ${product.brandName} ${product.name} gift card. Instant digital delivery.`,
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

  // Category
  const category = product.categoryId
    ? (await db.select().from(giftCategories).where(eq(giftCategories.id, product.categoryId)).limit(1))[0]
    : null;

  const discount =
    product.denomination > product.sellingPrice
      ? Math.round(((product.denomination - product.sellingPrice) / product.denomination) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/40 via-white to-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-10">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-slate-500">
          <Link href="/gift-codes" className="hover:text-emerald-600">Gift Codes</Link>
          {category && (
            <>
              <span>›</span>
              <Link href={`/gift-codes?category=${category.slug}`} className="hover:text-emerald-600">
                {category.icon} {category.name}
              </Link>
            </>
          )}
          <span>›</span>
          <span className="text-slate-800 font-medium line-clamp-1">{product.name}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1fr_420px]">
          {/* Left: Product info */}
          <div>
            {/* Product image / card */}
            <div className="relative overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-100 shadow-lg shadow-emerald-100/60">
              {product.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.image}
                  alt={`${product.brandName} ${product.name}`}
                  className="aspect-[16/8] w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[16/8] items-center justify-center">
                  <div className="text-center">
                    <div className="text-8xl mb-3">🎁</div>
                    <p className="text-2xl font-extrabold text-emerald-800">{product.brandName}</p>
                  </div>
                </div>
              )}
              {/* Denomination badge */}
              <div className="absolute bottom-4 right-4 rounded-2xl bg-white/95 px-5 py-3 backdrop-blur-sm shadow-md">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Card Value</p>
                <p className="text-2xl font-black text-emerald-700">{formatINR(product.denomination)}</p>
              </div>
            </div>

            {/* Product meta */}
            <div className="mt-8">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-0.5 text-xs font-bold text-emerald-700">
                  {product.brandName}
                </span>
                {category && (
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-0.5 text-xs font-semibold text-slate-600">
                    {category.icon} {category.name}
                  </span>
                )}
                {discount > 0 && (
                  <span className="rounded-full bg-red-500 px-3 py-0.5 text-xs font-bold text-white">
                    {discount}% OFF
                  </span>
                )}
              </div>

              <h1 className="mt-3 text-3xl font-extrabold text-slate-900">{product.name}</h1>

              {product.description && (
                <p className="mt-4 text-base leading-relaxed text-slate-600">{product.description}</p>
              )}

              {/* How it works */}
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {[
                  { icon: "🛒", title: "Buy", desc: "Complete checkout securely via Razorpay" },
                  { icon: "📧", title: "Receive", desc: "Code delivered instantly to your email" },
                  { icon: "🎮", title: "Redeem", desc: "Use on the brand's website or app" },
                ].map((step) => (
                  <div key={step.title} className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-center">
                    <div className="text-3xl">{step.icon}</div>
                    <p className="mt-2 font-bold text-slate-800">{step.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{step.desc}</p>
                  </div>
                ))}
              </div>

              {/* Terms & Instructions */}
              {product.instructions && (
                <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-5">
                  <h3 className="font-bold text-amber-800 mb-2">📋 Redemption Instructions</h3>
                  <p className="text-sm text-amber-700 leading-relaxed whitespace-pre-line">{product.instructions}</p>
                </div>
              )}

              {product.terms && (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <h3 className="font-bold text-slate-700 mb-2">📄 Terms & Conditions</h3>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{product.terms}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Purchase panel */}
          <div className="lg:sticky lg:top-24 self-start">
            <div className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-xl shadow-emerald-100/60">
              {/* Price section */}
              <div className="mb-6">
                <div className="flex items-end gap-3">
                  <p className="text-4xl font-black text-slate-900">{formatINR(product.sellingPrice)}</p>
                  {discount > 0 && (
                    <div>
                      <p className="text-base text-slate-400 line-through">{formatINR(product.denomination)}</p>
                      <p className="text-sm font-bold text-red-500">Save {discount}%</p>
                    </div>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  Gift Card Value: <strong>{formatINR(product.denomination)}</strong>
                </p>
              </div>

              {/* Stock indicator */}
              <div className={`mb-5 flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold ${
                inStock
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}>
                <span className={`h-2 w-2 rounded-full ${inStock ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
                {inStock ? `${available} code${available !== 1 ? "s" : ""} in stock` : "Out of stock"}
              </div>

              {/* Purchase form or CTA */}
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
                      className="block w-full text-center rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3.5 text-base font-bold text-white shadow-md shadow-emerald-200 hover:shadow-lg hover:shadow-emerald-300 hover:from-emerald-500 hover:to-teal-500 transition duration-200"
                    >
                      Sign In to Purchase
                    </Link>
                    <p className="text-center text-xs text-slate-500">
                      Don&apos;t have an account?{" "}
                      <Link href="/register" className="text-emerald-600 hover:underline">Register free</Link>
                    </p>
                  </div>
                )
              ) : (
                <div className="rounded-xl bg-slate-50 border border-slate-200 px-5 py-4 text-center text-sm text-slate-600">
                  <p className="font-semibold">Currently out of stock</p>
                  <p className="mt-1 text-slate-500">Check back soon or explore similar cards below.</p>
                </div>
              )}

              {/* Trust badges */}
              <div className="mt-6 grid grid-cols-2 gap-3">
                {[
                  { icon: "⚡", text: "Instant Delivery" },
                  { icon: "🔒", text: "Secure Payment" },
                  { icon: "🎁", text: "Valid Code Guaranteed" },
                  { icon: "💬", text: "24/7 Support" },
                ].map((b) => (
                  <div key={b.text} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
                    <span>{b.icon}</span>
                    <span>{b.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

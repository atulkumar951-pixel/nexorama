import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { cartItems, products } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { effectivePrice } from "@/lib/helpers";
import { formatINR } from "@/lib/format";
import { removeFromCart } from "@/lib/actions/shop-actions";
import { SubmitButton } from "@/components/client";
import ProductCover from "@/components/ProductCover";

export const dynamic = "force-dynamic";
export const metadata = { title: "Cart" };

export default async function CartPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/cart");

  const rows = await db
    .select({ product: products })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .where(eq(cartItems.userId, user.id));

  const items = rows.map((r) => r.product);
  const subtotal = items.reduce((s, p) => s + p.price, 0);
  const payable = items.reduce((s, p) => s + effectivePrice(p), 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold">Your Cart</h1>
      {items.length === 0 ? (
        <div className="card mt-8 p-16 text-center">
          <p className="text-5xl">🛒</p>
          <p className="mt-4 font-semibold text-slate-700">Your cart is empty</p>
          <Link href="/products" className="btn-primary mt-6">Browse Marketplace</Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="card divide-y divide-slate-100">
            {items.map((p) => (
              <div key={p.id} className="flex items-center gap-4 p-4">
                <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg">
                  <ProductCover
                    title={p.title}
                    coverImage={p.coverImage}
                    productType={p.productType}
                    aspectRatio="aspect-[16/10]"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <Link href={`/products/${p.slug}`} className="font-semibold text-slate-900 hover:text-indigo-600">{p.title}</Link>
                  <p className="text-xs text-slate-500">{p.productType} · Qty 1</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{p.isFree ? "Free" : formatINR(effectivePrice(p))}</p>
                  {!p.isFree && p.salePrice !== null && p.salePrice < p.price && (
                    <p className="text-xs text-slate-400 line-through">{formatINR(p.price)}</p>
                  )}
                </div>
                <form action={removeFromCart.bind(null, p.id)}>
                  <SubmitButton className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" pendingText="…">✕</SubmitButton>
                </form>
              </div>
            ))}
          </div>
          <div className="card h-fit p-6">
            <h2 className="font-bold">Summary</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd>{formatINR(subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Sale discount</dt><dd className="text-emerald-600">−{formatINR(subtotal - payable)}</dd></div>
              <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-bold"><dt>Total</dt><dd>{formatINR(payable)}</dd></div>
            </dl>
            <Link href="/checkout" className="btn-primary mt-5 w-full !py-3">Proceed to Checkout →</Link>
            <p className="mt-3 text-center text-xs text-slate-400">Coupons can be applied at checkout</p>
          </div>
        </div>
      )}
    </div>
  );
}

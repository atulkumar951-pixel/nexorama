import Link from "next/link";
import { notFound } from "next/navigation";
import { serverApi } from "@/lib/server-api";
import { inr, stockLabel, type GiftProductDetail } from "@/lib/gift";
import { GiftProductGrid } from "@/components/gift/gift-product-card";
import { AddToCart } from "./add-to-cart";

export const dynamic = "force-dynamic";

async function loadProduct(slug: string): Promise<GiftProductDetail | null> {
  try {
    return await serverApi<GiftProductDetail>(`/api/gift/products/${encodeURIComponent(slug)}`);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const product = await loadProduct(params.slug);
  if (!product) return { title: "Gift code not found" };
  return {
    title: `${product.name} — ${inr(product.sellingPrice)}`,
    description: product.description ?? `Buy ${product.name} gift code. Emailed after payment verification.`,
  };
}

export default async function GiftProductPage({ params }: { params: { slug: string } }) {
  const product = await loadProduct(params.slug);
  if (!product) notFound();

  const stock = stockLabel(product.stock);
  const saving = Number(product.denomination) - Number(product.sellingPrice);
  const maxQuantity = product.purchaseLimit ?? 10;

  return (
    <div className="container-page py-10">
      <nav className="text-xs text-gray-500">
        <Link href="/gift-cards" className="hover:underline">Gift Codes</Link>
        {product.category && (
          <>
            {" / "}
            <Link href={`/gift-cards?category=${product.category.slug}`} className="hover:underline">
              {product.category.name}
            </Link>
          </>
        )}
        {" / "}
        <span className="text-gray-700">{product.name}</span>
      </nav>

      <div className="mt-6 grid gap-8 lg:grid-cols-[380px_1fr]">
        <div className="card flex aspect-[4/3] items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-50 via-teal-50 to-white">
          {product.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-6xl">🎁</span>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">{product.brandName}</p>
          <h1 className="mt-1 text-2xl font-extrabold text-gray-900 sm:text-3xl">{product.name}</h1>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className={`badge ${stock.cls}`}>{stock.text}</span>
            <span className="badge bg-gray-100 text-gray-700">Gift value {inr(product.denomination)}</span>
            {product.purchaseLimit && <span className="badge bg-gray-100 text-gray-700">Max {product.purchaseLimit} per order</span>}
          </div>

          <div className="mt-5 flex items-end gap-3">
            <p className="text-3xl font-extrabold text-gray-900">{inr(product.sellingPrice)}</p>
            {saving > 0 && (
              <>
                <p className="text-sm text-gray-400 line-through">{inr(product.denomination)}</p>
                <p className="text-sm font-semibold text-emerald-600">You save {inr(saving)}</p>
              </>
            )}
          </div>

          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <strong>Important:</strong> Gift code purchases are non-refundable. Please verify the brand, denomination and quantity
            before completing payment.
          </div>

          <div className="mt-5">
            <AddToCart productId={product.id} maxQuantity={maxQuantity} outOfStock={product.stock.outOfStock} />
          </div>

          <div className="mt-6 rounded-xl bg-gray-50 p-4 text-xs text-gray-600">
            <p className="font-semibold text-gray-800">How delivery works</p>
            <p className="mt-1">
              Pay securely with Razorpay → we verify the payment → our team assigns and processes your code → the code is emailed to
              your registered address, usually within 5 minutes. The code is never displayed on this website.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        <div className="card p-5">
          <h2 className="font-bold text-gray-900">About this gift code</h2>
          <p className="mt-2 whitespace-pre-line text-sm text-gray-600">
            {product.description ?? `${product.brandName} gift card worth ${inr(product.denomination)}, delivered to your email after payment verification.`}
          </p>
        </div>
        <div className="card p-5">
          <h2 className="font-bold text-gray-900">How to redeem</h2>
          <p className="mt-2 whitespace-pre-line text-sm text-gray-600">
            {product.instructions ??
              "Open the email we send you, then redeem the code on the brand's official website or app. Codes are provider-specific."}
          </p>
        </div>
        <div className="card p-5">
          <h2 className="font-bold text-gray-900">Terms &amp; conditions</h2>
          <p className="mt-2 whitespace-pre-line text-sm text-gray-600">
            {product.terms ??
              "Non-refundable. Codes are valid for the value stated and are subject to the issuing brand's terms. Please check the denomination carefully before purchase."}
          </p>
        </div>
      </div>

      {product.related.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-bold text-gray-900">You may also like</h2>
          <div className="mt-5">
            <GiftProductGrid products={product.related} />
          </div>
        </section>
      )}
    </div>
  );
}

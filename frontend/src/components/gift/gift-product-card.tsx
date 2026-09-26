"use client";

import Link from "next/link";
import { inr, stockLabel, type GiftProductCard as GiftCard } from "@/lib/gift";

export function GiftProductCard({ product }: { product: GiftCard }) {
  const stock = stockLabel(product.stock);
  const saving = Number(product.denomination) - Number(product.sellingPrice);

  return (
    <Link
      href={`/gift-cards/${product.slug}`}
      className="card group flex flex-col overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-card-hover"
    >
      <div className="relative flex aspect-[16/10] w-full items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-50 via-teal-50 to-white">
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <span className="text-4xl font-extrabold text-emerald-600/70">🎁</span>
        )}
        <span className={`absolute left-3 top-3 rounded-full px-2 py-0.5 text-[11px] font-semibold ${stock.cls}`}>
          {stock.text}
        </span>
        {product.featured && (
          <span className="absolute right-3 top-3 rounded-full bg-amber-400/90 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
            Featured
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">{product.brandName}</p>
        <h3 className="mt-1 line-clamp-2 font-bold text-gray-900">{product.name}</h3>
        <p className="mt-1 text-xs text-gray-500">
          Gift value {inr(product.denomination)}
          {product.category ? ` · ${product.category.name}` : ""}
        </p>

        <div className="mt-auto flex items-end justify-between pt-3">
          <div>
            <p className="text-lg font-extrabold text-gray-900">{inr(product.sellingPrice)}</p>
            {saving > 0 && <p className="text-xs text-emerald-600">Save {inr(saving)}</p>}
          </div>
          <span className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white group-hover:bg-emerald-700">
            Buy now
          </span>
        </div>
      </div>
    </Link>
  );
}

export function GiftProductGrid({ products }: { products: GiftCard[] }) {
  if (products.length === 0) {
    return (
      <div className="card p-10 text-center text-sm text-gray-500">
        No gift codes match your search yet. Try another brand, category or denomination.
      </div>
    );
  }
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {products.map((p) => (
        <GiftProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}

"use client";

import Link from "next/link";
import { formatPrice, discountPercent, type ProductCard as ProductCardType } from "@/lib/types";

const TYPE_LABELS: Record<string, string> = {
  PDF: "PDF Notes",
  ZIP: "ZIP Bundle",
  DOCUMENT: "Document",
  EBOOK: "eBook",
  PLAYLIST: "Lecture Series",
  BUNDLE: "Bundle",
};

const TYPE_COLORS: Record<string, string> = {
  PDF: "bg-primary-50 text-primary-700",
  ZIP: "bg-purple-50 text-purple-700",
  DOCUMENT: "bg-blue-50 text-blue-700",
  EBOOK: "bg-emerald-50 text-emerald-700",
  PLAYLIST: "bg-rose-50 text-rose-700",
  BUNDLE: "bg-accent-400/20 text-accent-600",
};

export function ProductCard({ product }: { product: ProductCardType }) {
  const discount = discountPercent(product.price, product.salePrice);

  return (
    <Link
      href={`/products/${product.slug}`}
      className="card group flex flex-col overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-card-hover"
    >
      {/* Cover */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-primary-100 via-primary-50 to-white">
        {product.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.coverImage}
            alt={product.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-4xl font-black text-primary-300">
              {product.title.charAt(0)}
            </span>
          </div>
        )}
        {discount && (
          <span className="badge absolute left-3 top-3 bg-accent-500 text-white">-{discount}%</span>
        )}
        {product.isFeatured && (
          <span className="badge absolute right-3 top-3 bg-white/90 text-primary-700 shadow-sm">
            ★ Featured
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex items-center gap-2">
          <span className={`badge ${TYPE_COLORS[product.productType] ?? "bg-gray-100 text-gray-700"}`}>
            {TYPE_LABELS[product.productType] ?? product.productType}
          </span>
          {product.category && (
            <span className="truncate text-xs text-gray-400">{product.category.name}</span>
          )}
        </div>

        <h3 className="line-clamp-2 text-sm font-semibold text-gray-900 group-hover:text-primary-700">
          {product.title}
        </h3>
        {product.shortDescription && (
          <p className="mt-1.5 line-clamp-2 text-xs text-gray-500">{product.shortDescription}</p>
        )}

        <div className="mt-auto flex items-baseline gap-2 pt-3">
          <span className="text-lg font-bold text-gray-900">
            {formatPrice(product.salePrice ?? product.price, product.isFree)}
          </span>
          {discount && (
            <span className="text-sm text-gray-400 line-through">{formatPrice(product.price)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function ProductGrid({ products }: { products: ProductCardType[] }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}

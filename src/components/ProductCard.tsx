import Link from "next/link";
import { formatINR } from "@/lib/format";
import ProductCover from "./ProductCover";

export type ProductCardData = {
  id: number;
  title: string;
  slug: string;
  shortDescription: string | null;
  coverImage: string | null;
  productType: string;
  price: number;
  salePrice: number | null;
  isFree: boolean;
  isFeatured: boolean;
  categoryName?: string | null;
};

export const TYPE_LABELS: Record<string, string> = {
  PDF: "📄 PDF",
  ZIP: "🗜️ ZIP Pack",
  DOCUMENT: "📃 Document",
  EBOOK: "📖 eBook",
  COURSE: "🎬 Video Course",
  BUNDLE: "🎁 Bundle",
};

export default function ProductCard({ p }: { p: ProductCardData }) {
  const final = p.isFree ? 0 : p.salePrice !== null && p.salePrice < p.price ? p.salePrice : p.price;
  const hasDiscount = !p.isFree && p.salePrice !== null && p.salePrice < p.price;
  const pct = hasDiscount ? Math.round(((p.price - final) / p.price) * 100) : 0;

  return (
    <Link
      href={`/products/${p.slug}`}
      className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="relative overflow-hidden">
        <ProductCover
          title={p.title}
          coverImage={p.coverImage}
          productType={p.productType}
          aspectRatio="aspect-square"
        />
        {p.isFeatured && (
          <span className="badge absolute left-2 top-2 z-20 bg-amber-400 text-amber-950 shadow-sm">★ Featured</span>
        )}
        {hasDiscount && (
          <span className="badge absolute right-2 top-2 z-20 bg-red-500 text-white shadow-sm">-{pct}%</span>
        )}
        {p.isFree && (
          <span className="badge absolute right-2 top-2 z-20 bg-emerald-500 text-white shadow-sm">FREE</span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-1.5 flex items-center gap-2 text-xs text-slate-500">
          <span>{TYPE_LABELS[p.productType] ?? p.productType}</span>
          {p.categoryName && (
            <>
              <span aria-hidden>·</span>
              <span className="truncate">{p.categoryName}</span>
            </>
          )}
        </div>
        <h3 className="line-clamp-2 font-semibold text-slate-900 group-hover:text-indigo-700">{p.title}</h3>
        {p.shortDescription && (
          <p className="mt-1 line-clamp-2 text-sm text-slate-500">{p.shortDescription}</p>
        )}
        <div className="mt-auto flex items-baseline gap-2 pt-3">
          <span className="text-lg font-bold text-slate-900">{p.isFree ? "Free" : formatINR(final)}</span>
          {hasDiscount && <span className="text-sm text-slate-400 line-through">{formatINR(p.price)}</span>}
        </div>
      </div>
    </Link>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { categories, productAssets, productLectures, products, wishlistItems } from "@/db/schema";
import { and, asc, eq, ne } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { getActiveGrant } from "@/lib/helpers";
import { formatINR, formatBytes } from "@/lib/format";
import ProductCard, { TYPE_LABELS } from "@/components/ProductCard";
import ProductCover from "@/components/ProductCover";
import { DownloadButton, SubmitButton } from "@/components/client";
import { addToCart, toggleWishlist } from "@/lib/actions/shop-actions";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const [p] = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
  if (!p) return { title: "Product not found" };
  return {
    title: p.title,
    description: p.shortDescription ?? undefined,
    openGraph: { title: p.title, description: p.shortDescription ?? undefined, images: p.coverImage ? [p.coverImage] : undefined },
  };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [row] = await db
    .select({ product: products, categoryName: categories.name, categorySlug: categories.slug })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.slug, slug))
    .limit(1);
  if (!row || row.product.status !== "PUBLISHED") notFound();
  const p = row.product;

  const user = await getCurrentUser();
  const [assets, lectures, grant, wish] = await Promise.all([
    db.select().from(productAssets).where(and(eq(productAssets.productId, p.id), eq(productAssets.status, "ACTIVE"))).orderBy(asc(productAssets.sortOrder)),
    db.select().from(productLectures).where(eq(productLectures.productId, p.id)).orderBy(asc(productLectures.sortOrder), asc(productLectures.id)),
    user ? getActiveGrant(user.id, p.id) : Promise.resolve(null),
    user
      ? db.select().from(wishlistItems).where(and(eq(wishlistItems.userId, user.id), eq(wishlistItems.productId, p.id))).limit(1)
      : Promise.resolve([]),
  ]);
  const inWishlist = wish.length > 0;

  const related = p.categoryId
    ? await db
        .select({ product: products, categoryName: categories.name })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(and(eq(products.categoryId, p.categoryId), eq(products.status, "PUBLISHED"), ne(products.id, p.id)))
        .limit(4)
    : [];

  const final = p.isFree ? 0 : p.salePrice !== null && p.salePrice < p.price ? p.salePrice : p.price;
  const hasDiscount = !p.isFree && p.salePrice !== null && p.salePrice < p.price;
  const chapters = new Map<string, typeof lectures>();
  for (const l of lectures) {
    const key = l.chapterTitle ?? "Lectures";
    if (!chapters.has(key)) chapters.set(key, []);
    chapters.get(key)!.push(l);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <nav className="mb-4 text-sm text-slate-500">
        <Link href="/products" className="hover:text-indigo-600">Marketplace</Link>
        {row.categoryName && (
          <> / <Link href={`/products?category=${row.categorySlug}`} className="hover:text-indigo-600">{row.categoryName}</Link></>
        )}
        {" / "}<span className="text-slate-700">{p.title}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div>
          <div className="card overflow-hidden">
            <ProductCover
              title={p.title}
              coverImage={p.coverImage}
              productType={p.productType}
              aspectRatio="aspect-square max-w-xl mx-auto"
            />
          </div>

          <div className="card mt-6 p-6">
            <h2 className="text-lg font-bold">About this product</h2>
            <div className="prose prose-slate mt-3 max-w-none whitespace-pre-line text-sm leading-relaxed text-slate-600">
              {p.description ?? p.shortDescription ?? "No description provided."}
            </div>
          </div>

          {assets.length > 0 && (
            <div className="card mt-6 p-6">
              <h2 className="text-lg font-bold">📦 What&apos;s included</h2>
              <ul className="mt-4 divide-y divide-slate-100">
                {assets.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <p className="font-medium text-slate-800">{a.fileName}</p>
                      <p className="text-xs text-slate-500">
                        {a.fileType.toUpperCase()} · {formatBytes(a.fileSize)}
                        {a.isPreview && <span className="badge ml-2 bg-emerald-100 text-emerald-700">Free preview</span>}
                      </p>
                    </div>
                    {a.isPreview ? (
                      user ? (
                        <DownloadButton assetId={a.id} fileName={a.fileName} className="btn-secondary !py-1.5 text-xs" />
                      ) : (
                        <Link href={`/login?next=/products/${p.slug}`} className="text-xs font-semibold text-indigo-600 hover:underline">Sign in to preview</Link>
                      )
                    ) : (
                      <span className="text-lg" title="Purchase to unlock">🔒</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {lectures.length > 0 && (
            <div className="card mt-6 p-6">
              <h2 className="text-lg font-bold">🎬 Course content</h2>
              {[...chapters.entries()].map(([chapter, list]) => (
                <div key={chapter} className="mt-4">
                  <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">{chapter}</p>
                  <ul className="mt-2 divide-y divide-slate-100">
                    {list.map((l, i) => (
                      <li key={l.id} className="flex items-center justify-between gap-3 py-2.5">
                        <div className="flex items-center gap-3">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600">{i + 1}</span>
                          <div>
                            <p className="text-sm font-medium text-slate-800">{l.title}</p>
                            <p className="text-xs text-slate-500">{l.provider}{l.duration ? ` · ${l.duration}` : ""}</p>
                          </div>
                        </div>
                        {l.isPreview ? (
                          <a href={l.externalUrl} target="_blank" rel="noopener noreferrer" className="badge bg-emerald-100 text-emerald-700 hover:bg-emerald-200">▶ Free preview</a>
                        ) : (
                          <span title="Purchase to unlock">🔒</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Purchase sidebar */}
        <aside>
          <div className="card sticky top-24 p-6">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>{TYPE_LABELS[p.productType] ?? p.productType}</span>
              {row.categoryName && <><span>·</span><span>{row.categoryName}</span></>}
            </div>
            <h1 className="mt-2 text-2xl font-bold leading-snug">{p.title}</h1>
            {p.shortDescription && <p className="mt-2 text-sm text-slate-500">{p.shortDescription}</p>}

            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-3xl font-extrabold">{p.isFree ? "Free" : formatINR(final)}</span>
              {hasDiscount && (
                <>
                  <span className="text-lg text-slate-400 line-through">{formatINR(p.price)}</span>
                  <span className="badge bg-red-100 text-red-600">{Math.round(((p.price - final) / p.price) * 100)}% OFF</span>
                </>
              )}
            </div>

            <div className="mt-5 space-y-3">
              {grant ? (
                <>
                  <div className="rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">✓ Already purchased</div>
                  <Link href={`/library/${p.id}`} className="btn-primary w-full">Go to Library →</Link>
                </>
              ) : (
                <>
                  <form action={addToCart.bind(null, p.id, true)}>
                    <SubmitButton className="btn-primary w-full !py-3">
                      {p.isFree ? "Get for Free" : "Buy Now"}
                    </SubmitButton>
                  </form>
                  <form action={addToCart.bind(null, p.id, false)}>
                    <SubmitButton className="btn-secondary w-full">Add to Cart</SubmitButton>
                  </form>
                  <form action={toggleWishlist.bind(null, p.id, `/products/${p.slug}`)}>
                    <SubmitButton className="btn-secondary w-full !border-transparent !shadow-none">
                      {inWishlist ? "♥ Remove from Wishlist" : "♡ Add to Wishlist"}
                    </SubmitButton>
                  </form>
                </>
              )}
            </div>

            <ul className="mt-6 space-y-2 border-t border-slate-100 pt-4 text-sm text-slate-600">
              <li>⚡ Instant delivery to your library</li>
              <li>🔒 Secure, expiring download links</li>
              <li>⬇ Download limit: {p.downloadLimit === 0 ? "Unlimited" : `${p.downloadLimit} downloads`}</li>
              <li>🕒 Access: {p.accessDays ? `${p.accessDays} days` : "Lifetime"}</li>
              {assets.length > 0 && <li>📁 {assets.length} downloadable file{assets.length > 1 ? "s" : ""}</li>}
              {lectures.length > 0 && <li>🎬 {lectures.length} lecture{lectures.length > 1 ? "s" : ""}</li>}
            </ul>
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-6 text-2xl font-bold">Related Products</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {related.map(({ product, categoryName }) => (
              <ProductCard key={product.id} p={{ ...product, categoryName }} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { serverApi } from "@/lib/server-api";
import { formatPrice, discountPercent, type ProductDetail as ProductDetailType } from "@/lib/types";
import { ProductGrid } from "@/components/product/product-card";

async function getProduct(slug: string): Promise<ProductDetailType | null> {
  try {
    const res = await serverApi<{ product: ProductDetailType }>(`/api/products/${slug}`);
    return res.product;
  } catch {
    return null;
  }
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const product = await getProduct(params.slug);
  if (!product) return { title: "Product not found" };
  return {
    title: product.seoTitle ?? product.title,
    description: product.seoDescription ?? product.shortDescription ?? undefined,
    alternates: { canonical: `/products/${product.slug}` },
  };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProduct(params.slug);
  if (!product) notFound();

  const discount = discountPercent(product.price, product.salePrice);
  const lectureCount = product.chapters.reduce((acc, ch) => acc + ch.lectures.length, 0);

  return (
    <div className="container-page py-10">
      <nav className="mb-6 flex items-center gap-2 text-sm text-gray-500" aria-label="Breadcrumb">
        <Link href="/products" className="hover:text-primary-700">Products</Link>
        {product.category && (
          <>
            <span>/</span>
            <Link href={`/categories/${product.category.slug}`} className="hover:text-primary-700">
              {product.category.name}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="truncate text-gray-700">{product.title}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="card overflow-hidden">
            <div className="relative aspect-[16/9] w-full bg-gradient-to-br from-primary-100 via-primary-50 to-white">
              {product.coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.coverImage} alt={product.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-7xl font-black text-primary-300">
                  {product.title.charAt(0)}
                </div>
              )}
            </div>
          </div>

          <section className="mt-8">
            <h2 className="text-lg font-bold text-gray-900">Description</h2>
            {product.description ? (
              <div
                className="prose prose-sm mt-3 max-w-none text-gray-600"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            ) : (
              <p className="mt-3 text-sm text-gray-500">{product.shortDescription}</p>
            )}
          </section>

          {product.assets.length > 0 && (
            <section className="mt-8">
              <h2 className="text-lg font-bold text-gray-900">What&apos;s Included</h2>
              <ul className="mt-3 space-y-2">
                {product.assets.map((asset) => (
                  <li key={asset.id} className="card flex items-center justify-between p-3.5">
                    <div className="flex items-center gap-3">
                      <span className="badge bg-primary-50 text-primary-700 uppercase">{asset.fileType}</span>
                      <span className="text-sm font-medium text-gray-800">{asset.fileName}</span>
                      {asset.isPreview && <span className="badge bg-success-50 text-success-700">Free preview</span>}
                    </div>
                    <span className="text-xs text-gray-400">{formatSize(asset.fileSize)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {product.chapters.length > 0 && (
            <section className="mt-8">
              <h2 className="text-lg font-bold text-gray-900">Lecture Content ({lectureCount} lectures)</h2>
              <div className="mt-3 space-y-5">
                {product.chapters.map((chapter, i) => (
                  <div key={chapter.id}>
                    <h3 className="text-sm font-semibold text-gray-800">{i + 1}. {chapter.title}</h3>
                    <ul className="mt-2 space-y-1.5">
                      {chapter.lectures.map((lecture) => (
                        <li
                          key={lecture.id}
                          className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3.5 py-2.5"
                        >
                          <span className="text-sm text-gray-700">
                            {lecture.title}
                            {lecture.isPreview && (
                              <span className="badge ml-2 bg-success-50 text-success-700">Free preview</span>
                            )}
                          </span>
                          <span className="ml-4 shrink-0 text-xs text-gray-400">
                            {lecture.duration ? formatDuration(lecture.duration) : lecture.provider}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}

          {product.bundleItems.length > 0 && (
            <section className="mt-8">
              <h2 className="text-lg font-bold text-gray-900">This bundle includes</h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {product.bundleItems.map(({ child }) => (
                  <li key={child.id}>
                    <Link href={`/products/${child.slug}`} className="card flex items-center gap-3 p-3 hover:shadow-card-hover">
                      <span className="text-sm font-medium text-gray-800">{child.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {product.related.length > 0 && (
            <section className="mt-12">
              <h2 className="mb-5 text-lg font-bold text-gray-900">Related Products</h2>
              <ProductGrid products={product.related} />
            </section>
          )}
        </div>

        {/* Purchase sidebar */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card p-6">
            <h1 className="text-xl font-bold leading-snug text-gray-900">{product.title}</h1>
            {product.category && (
              <Link href={`/categories/${product.category.slug}`} className="mt-1.5 inline-block text-sm text-primary-700 hover:underline">
                {product.category.name}
              </Link>
            )}

            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-gray-900">
                {formatPrice(product.salePrice ?? product.price, product.isFree)}
              </span>
              {discount && (
                <>
                  <span className="text-lg text-gray-400 line-through">{formatPrice(product.price)}</span>
                  <span className="badge bg-accent-500/15 text-accent-600">{discount}% off</span>
                </>
              )}
            </div>

            <div className="mt-6 space-y-2.5">
              <Link href={`/checkout?product=${product.slug}`} className="btn-primary w-full">
                {product.isFree ? "Get for Free" : "Buy Now"}
              </Link>
              <Link href={`/wishlist?add=${product.slug}`} className="btn-secondary w-full">
                ♥ Add to Wishlist
              </Link>
            </div>

            <ul className="mt-6 space-y-2 border-t border-gray-100 pt-5 text-sm text-gray-600">
              <li className="flex items-center gap-2"><span className="text-success-500">✓</span> Lifetime access</li>
              {product.assets.length > 0 && (
                <li className="flex items-center gap-2">
                  <span className="text-success-500">✓</span>
                  {product.assets.length} downloadable file{product.assets.length === 1 ? "" : "s"}
                </li>
              )}
              {lectureCount > 0 && (
                <li className="flex items-center gap-2"><span className="text-success-500">✓</span> {lectureCount} video lectures</li>
              )}
              <li className="flex items-center gap-2"><span className="text-success-500">✓</span> Secure payment via Razorpay</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
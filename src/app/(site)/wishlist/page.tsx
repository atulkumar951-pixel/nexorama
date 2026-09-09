import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { products, wishlistItems } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { effectivePrice } from "@/lib/helpers";
import { formatINR } from "@/lib/format";
import { moveWishlistToCart, toggleWishlist } from "@/lib/actions/shop-actions";
import { SubmitButton } from "@/components/client";
import ProductCover from "@/components/ProductCover";

export const dynamic = "force-dynamic";
export const metadata = { title: "Wishlist" };

export default async function WishlistPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/wishlist");

  const rows = await db
    .select({ product: products })
    .from(wishlistItems)
    .innerJoin(products, eq(wishlistItems.productId, products.id))
    .where(eq(wishlistItems.userId, user.id))
    .orderBy(desc(wishlistItems.createdAt));

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold">Wishlist</h1>
      {rows.length === 0 ? (
        <div className="card mt-8 p-16 text-center">
          <p className="text-5xl">♡</p>
          <p className="mt-4 font-semibold text-slate-700">Your wishlist is empty</p>
          <Link href="/products" className="btn-primary mt-6">Browse Marketplace</Link>
        </div>
      ) : (
        <div className="card mt-8 divide-y divide-slate-100">
          {rows.map(({ product: p }) => (
            <div key={p.id} className="flex flex-wrap items-center gap-4 p-4">
              <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg">
                <ProductCover
                  title={p.title}
                  coverImage={p.coverImage}
                  productType={p.productType}
                  aspectRatio="aspect-[16/10]"
                />
              </div>
              <div className="min-w-0 flex-1">
                <Link href={`/products/${p.slug}`} className="font-semibold hover:text-indigo-600">{p.title}</Link>
                <p className="text-sm">
                  {p.status !== "PUBLISHED" ? (
                    <span className="text-red-500">Currently unavailable</span>
                  ) : (
                    <span className="font-bold">{p.isFree ? "Free" : formatINR(effectivePrice(p))}</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {p.status === "PUBLISHED" && (
                  <form action={moveWishlistToCart.bind(null, p.id)}>
                    <SubmitButton className="btn-primary !py-2 !text-xs">Move to Cart</SubmitButton>
                  </form>
                )}
                <form action={toggleWishlist.bind(null, p.id, "/wishlist")}>
                  <SubmitButton className="btn-secondary !py-2 !text-xs !text-red-600">Remove</SubmitButton>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

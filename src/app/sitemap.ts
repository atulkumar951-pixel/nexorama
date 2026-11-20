import type { MetadataRoute } from "next";
import { db } from "@/db";
import { products, giftProducts } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "https://nexorama.store";

  let published: any[] = [];
  let publishedGifts: any[] = [];

  try {
    [published, publishedGifts] = await Promise.all([
      db
        .select({ slug: products.slug, updatedAt: products.updatedAt })
        .from(products)
        .where(eq(products.status, "PUBLISHED")),
      db
        .select({ slug: giftProducts.slug, updatedAt: giftProducts.updatedAt })
        .from(giftProducts)
        .where(eq(giftProducts.status, "PUBLISHED")),
    ]);
  } catch (err) {
    console.error("sitemap query error:", err);
  }

  return [
    { url: `${base}/`, priority: 1 },
    { url: `${base}/gift-codes`, priority: 1 },
    { url: `${base}/products`, priority: 0.9 },
    { url: `${base}/categories`, priority: 0.8 },
    { url: `${base}/contact`, priority: 0.7 },
    ...publishedGifts.map((g) => ({
      url: `${base}/gift-codes/${g.slug}`,
      lastModified: g.updatedAt,
      priority: 0.8,
    })),
    ...published.map((p) => ({
      url: `${base}/products/${p.slug}`,
      lastModified: p.updatedAt,
      priority: 0.7,
    })),
  ];
}

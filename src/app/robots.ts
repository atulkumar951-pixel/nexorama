import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "https://nexorama.store";
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/nexora", "/admin", "/api", "/library", "/orders", "/checkout", "/pay"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}

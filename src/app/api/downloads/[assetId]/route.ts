import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/db";
import { downloads, productAssets, products } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { getActiveGrant } from "@/lib/helpers";

const LINK_TTL_MINUTES = 10;

export async function POST(req: NextRequest, ctx: { params: Promise<{ assetId: string }> }) {
  const { assetId: assetIdRaw } = await ctx.params;
  const assetId = Number(assetIdRaw);
  if (!assetId) return NextResponse.json({ error: "Invalid asset" }, { status: 400 });

  // 1. Authentication
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in to download." }, { status: 401 });

  // 2. Asset + product status
  const [row] = await db
    .select({ asset: productAssets, product: products })
    .from(productAssets)
    .innerJoin(products, eq(productAssets.productId, products.id))
    .where(eq(productAssets.id, assetId))
    .limit(1);
  if (!row || row.asset.status !== "ACTIVE") {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }
  const { asset, product } = row;
  if (product.status === "ARCHIVED") {
    return NextResponse.json({ error: "This product is no longer available." }, { status: 403 });
  }

  // 3. Ownership (free previews are allowed without purchase)
  if (!asset.isPreview) {
    const grant = await getActiveGrant(user.id, product.id);
    if (!grant) {
      return NextResponse.json({ error: "You do not have access to this file." }, { status: 403 });
    }
  }

  // 4. Download limit (completed downloads per product per user)
  if (!asset.isPreview && product.downloadLimit > 0) {
    const [used] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(downloads)
      .where(
        and(
          eq(downloads.userId, user.id),
          eq(downloads.productId, product.id),
          eq(downloads.status, "COMPLETED")
        )
      );
    if ((used?.count ?? 0) >= product.downloadLimit) {
      return NextResponse.json(
        { error: `Download limit reached (${product.downloadLimit}). Contact support if you need more.` },
        { status: 429 }
      );
    }
  }

  // 5. Generate short-lived token
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + LINK_TTL_MINUTES * 60_000);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  await db.insert(downloads).values({
    userId: user.id,
    productId: product.id,
    assetId: asset.id,
    token,
    expiresAt,
    ipAddress: ip,
  });

  return NextResponse.json({
    url: `/api/downloads/file/${token}`,
    expiresInMinutes: LINK_TTL_MINUTES,
    fileName: asset.fileName,
  });
}

import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { db } from "@/db";
import { downloads, productAssets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

const MIME: Record<string, string> = {
  pdf: "application/pdf",
  zip: "application/zip",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  txt: "text/plain",
  epub: "application/epub+zip",
};

export async function GET(_req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [dl] = await db.select().from(downloads).where(eq(downloads.token, token)).limit(1);
  if (!dl || dl.userId !== user.id) {
    return NextResponse.json({ error: "Download link not found." }, { status: 404 });
  }
  if (dl.expiresAt < new Date()) {
    await db.update(downloads).set({ status: "EXPIRED" }).where(eq(downloads.id, dl.id));
    return NextResponse.json({ error: "This download link has expired. Please generate a new one." }, { status: 410 });
  }

  const [asset] = await db.select().from(productAssets).where(eq(productAssets.id, dl.assetId)).limit(1);
  if (!asset) return NextResponse.json({ error: "File not found." }, { status: 404 });

  await db
    .update(downloads)
    .set({ status: "COMPLETED", completedAt: new Date() })
    .where(eq(downloads.id, dl.id));

  // 1. External Download URL (Google Drive, Dropbox, AWS S3, etc.)
  if (asset.externalUrl && /^https?:\/\//i.test(asset.externalUrl)) {
    return NextResponse.redirect(asset.externalUrl);
  }

  // 2. Base64 database-stored file
  if (asset.fileData) {
    const fileBuffer = Buffer.from(asset.fileData, "base64");
    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        "Content-Type": MIME[asset.fileType] ?? "application/octet-stream",
        "Content-Disposition": `attachment; filename="${asset.fileName.replace(/"/g, "")}"`,
        "Content-Length": String(fileBuffer.length),
        "Cache-Control": "no-store",
      },
    });
  }

  // 3. Local / tmp disk cache
  let body: Buffer | null = null;
  if (asset.storageKey) {
    const tmpPath = path.join(/*turbopackIgnore: true*/ os.tmpdir(), "nexora-uploads", asset.storageKey);
    try {
      body = await fs.readFile(/*turbopackIgnore: true*/ tmpPath);
    } catch {
      // file not on disk or serverless instance
    }
  }

  if (!body) {
    // 4. Placeholder fallback
    body = Buffer.from(
      `Nexora — ${asset.fileName}\n\nThis is your purchased digital file.\nDownloaded by: ${user.name} <${user.email}>\nGenerated: ${new Date().toISOString()}\n`
    );
  }

  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": MIME[asset.fileType] ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename="${asset.fileName.replace(/"/g, "")}"`,
      "Cache-Control": "no-store",
    },
  });
}

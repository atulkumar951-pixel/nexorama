import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { productAssets, productLectures, products } from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";
import ProductForm from "../product-form";
import ActionForm from "@/components/ActionForm";
import { SubmitButton, ConfirmButton } from "@/components/client";
import {
  addExternalAssetAction,
  addLectureAction,
  deleteAssetAction,
  deleteLectureAction,
  deleteProductAction,
  setProductStatus,
  uploadAssetAction,
} from "@/lib/actions/admin-actions";
import { formatBytes, statusBadgeClass } from "@/lib/format";

import { redirect } from "next/navigation";
import { getMarketplaceMode } from "@/lib/marketplace-mode";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Edit Product" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const mode = await getMarketplaceMode();
  if (mode === "GIFT_CODES") {
    redirect("/nexora/gift-cards/products");
  }
  const { id } = await params;
  const [product] = await db.select().from(products).where(eq(products.id, Number(id))).limit(1);
  if (!product) notFound();

  const [assets, lectures] = await Promise.all([
    db
      .select({
        id: productAssets.id,
        productId: productAssets.productId,
        fileName: productAssets.fileName,
        fileType: productAssets.fileType,
        fileSize: productAssets.fileSize,
        storageKey: productAssets.storageKey,
        externalUrl: productAssets.externalUrl,
        isPreview: productAssets.isPreview,
        sortOrder: productAssets.sortOrder,
        status: productAssets.status,
      })
      .from(productAssets)
      .where(and(eq(productAssets.productId, product.id), eq(productAssets.status, "ACTIVE")))
      .orderBy(asc(productAssets.sortOrder)),
    db.select().from(productLectures).where(eq(productLectures.productId, product.id)).orderBy(asc(productLectures.sortOrder), asc(productLectures.id)),
  ]);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{product.title}</h1>
          <p className="text-sm text-slate-500">
            <span className={`badge ${statusBadgeClass(product.status)}`}>{product.status}</span>
            {product.status === "PUBLISHED" && (
              <Link href={`/products/${product.slug}`} className="ml-2 text-indigo-600 hover:underline">View live →</Link>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {product.status !== "PUBLISHED" ? (
            <form action={setProductStatus.bind(null, product.id, "PUBLISHED")}>
              <SubmitButton className="btn-primary !bg-emerald-600 hover:!bg-emerald-700">Publish</SubmitButton>
            </form>
          ) : (
            <form action={setProductStatus.bind(null, product.id, "UNPUBLISHED")}>
              <SubmitButton className="btn-secondary">Unpublish</SubmitButton>
            </form>
          )}
          <form action={setProductStatus.bind(null, product.id, "ARCHIVED")}>
            <SubmitButton className="btn-secondary !text-slate-600">Archive</SubmitButton>
          </form>
          <ConfirmButton
            action={deleteProductAction.bind(null, product.id)}
            confirmText={`Are you sure you want to permanently delete "${product.title}"? This cannot be undone.`}
            className="btn-secondary !text-red-600 hover:!bg-red-50 hover:!border-red-200"
          >
            Delete Product
          </ConfirmButton>
        </div>
      </div>

      <div className="mt-6">
        <ProductForm product={product} />
      </div>

      {/* Files */}
      <div className="card mt-8 p-6">
        <h2 className="text-lg font-bold">📁 Files & Digital Downloads ({assets.length})</h2>
        <ul className="mt-4 divide-y divide-slate-100 text-sm">
          {assets.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
              <div>
                <p className="font-medium">{a.fileName}</p>
                <p className="text-xs text-slate-500">
                  {a.fileType.toUpperCase()} · {a.fileSize > 0 ? formatBytes(a.fileSize) : "Cloud Hosted"}
                  {a.externalUrl && <span className="ml-2 text-indigo-600 underline">External Link</span>}
                  {a.isPreview && <span className="badge ml-2 bg-emerald-100 text-emerald-700">Preview</span>}
                </p>
              </div>
              <ConfirmButton
                action={deleteAssetAction.bind(null, a.id, product.id)}
                confirmText={`Delete file "${a.fileName}"?`}
                className="text-xs font-semibold text-red-600 hover:underline"
              >
                Delete
              </ConfirmButton>
            </li>
          ))}
          {assets.length === 0 && <li className="py-3 text-slate-400">No files uploaded yet.</li>}
        </ul>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {/* Method 1: Direct File Upload */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Upload File Directly</h3>
            <p className="mt-0.5 text-xs text-slate-500">PDF, ZIP, DOCX up to 4.5 MB (stored securely in DB)</p>
            <ActionForm action={uploadAssetAction} submitLabel="Upload file" className="mt-3 space-y-3">
              <input type="hidden" name="productId" value={product.id} />
              <div>
                <input type="file" name="file" required className="input !p-1.5 text-xs" accept=".pdf,.zip,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.epub" />
              </div>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" name="isPreview" className="h-3.5 w-3.5 rounded" /> Free preview (downloadable without purchase)
              </label>
            </ActionForm>
          </div>

          {/* Method 2: Cloud / External Download Link */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Add Cloud / Direct Link</h3>
            <p className="mt-0.5 text-xs text-slate-500">Google Drive, Dropbox, AWS S3, OneDrive, Mega</p>
            <ActionForm action={addExternalAssetAction} submitLabel="Attach Link" className="mt-3 space-y-2">
              <input type="hidden" name="productId" value={product.id} />
              <div>
                <input name="fileName" required className="input text-xs" placeholder="e.g. Complete Course Material.zip" />
              </div>
              <div>
                <input name="externalUrl" required className="input text-xs" placeholder="https://drive.google.com/uc?id=... or direct link" />
              </div>
              <div className="flex gap-2">
                <select name="fileType" className="input text-xs !py-1">
                  <option value="zip">ZIP</option>
                  <option value="pdf">PDF</option>
                  <option value="docx">DOCX</option>
                  <option value="epub">EPUB</option>
                  <option value="other">OTHER</option>
                </select>
                <label className="flex items-center gap-1.5 text-xs">
                  <input type="checkbox" name="isPreview" className="h-3.5 w-3.5 rounded" /> Preview
                </label>
              </div>
            </ActionForm>
          </div>
        </div>
      </div>

      {/* Lectures */}
      <div className="card mt-8 p-6">
        <h2 className="text-lg font-bold">🎬 External Lectures ({lectures.length})</h2>
        <ul className="mt-4 divide-y divide-slate-100 text-sm">
          {lectures.map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="font-medium">{l.chapterTitle} — {l.title}</p>
                <p className="truncate text-xs text-slate-500">
                  {l.provider} · {l.duration ?? "—"} · <a href={l.externalUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">{l.externalUrl}</a>
                  {l.isPreview && <span className="badge ml-2 bg-emerald-100 text-emerald-700">Preview</span>}
                </p>
              </div>
              <ConfirmButton
                action={deleteLectureAction.bind(null, l.id, product.id)}
                confirmText={`Delete lecture "${l.title}"?`}
                className="text-xs font-semibold text-red-600 hover:underline"
              >
                Delete
              </ConfirmButton>
            </li>
          ))}
          {lectures.length === 0 && <li className="py-3 text-slate-400">No lectures added yet.</li>}
        </ul>
        <div className="mt-4 rounded-lg bg-slate-50 p-4">
          <ActionForm action={addLectureAction} submitLabel="Add lecture" className="space-y-3">
            <input type="hidden" name="productId" value={product.id} />
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="label">Chapter title</label>
                <input name="chapterTitle" className="input" placeholder="Chapter 1" />
              </div>
              <div>
                <label className="label">Lecture title *</label>
                <input name="title" required className="input" placeholder="Introduction to Java" />
              </div>
              <div className="md:col-span-2">
                <label className="label">External video URL *</label>
                <input name="externalUrl" required className="input" placeholder="https://www.youtube.com/watch?v=…" />
              </div>
              <div>
                <label className="label">Provider</label>
                <select name="provider" className="input">
                  <option>YouTube</option>
                  <option>Vimeo</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="label">Duration</label>
                <input name="duration" className="input" placeholder="12:34" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isPreview" className="h-4 w-4 rounded" /> Free preview lecture
            </label>
          </ActionForm>
        </div>
      </div>
    </div>
  );
}

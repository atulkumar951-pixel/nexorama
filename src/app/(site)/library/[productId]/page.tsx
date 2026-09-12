import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { downloads, lectureProgress, productAssets, productLectures, products } from "@/db/schema";
import { and, asc, eq, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { getActiveGrant } from "@/lib/helpers";
import { formatBytes, formatDate } from "@/lib/format";
import { DownloadButton, SubmitButton } from "@/components/client";
import { toggleLectureComplete } from "@/lib/actions/shop-actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Library Item" };

export default async function LibraryItemPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId: pidRaw } = await params;
  const productId = Number(pidRaw);
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/library");

  const grant = await getActiveGrant(user.id, productId);
  if (!grant) redirect("/library");

  const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  if (!product) redirect("/library");

  const [assets, lectures, progress, [dlCount]] = await Promise.all([
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
      .where(and(eq(productAssets.productId, productId), eq(productAssets.status, "ACTIVE")))
      .orderBy(asc(productAssets.sortOrder)),
    db.select().from(productLectures).where(eq(productLectures.productId, productId)).orderBy(asc(productLectures.sortOrder), asc(productLectures.id)),
    db.select().from(lectureProgress).where(eq(lectureProgress.userId, user.id)),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(downloads)
      .where(and(eq(downloads.userId, user.id), eq(downloads.productId, productId), eq(downloads.status, "COMPLETED"))),
  ]);

  const doneSet = new Set(progress.filter((p) => p.completed).map((p) => p.lectureId));
  const completedCount = lectures.filter((l) => doneSet.has(l.id)).length;
  const used = dlCount?.c ?? 0;

  const chapters = new Map<string, typeof lectures>();
  for (const l of lectures) {
    const key = l.chapterTitle ?? "Lectures";
    if (!chapters.has(key)) chapters.set(key, []);
    chapters.get(key)!.push(l);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/library" className="text-sm text-slate-500 hover:text-indigo-600">← Back to Library</Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{product.title}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Purchased {formatDate(grant.grantedAt)} · {grant.expiresAt ? `Access expires ${formatDate(grant.expiresAt)}` : "Lifetime access"}
          </p>
        </div>
        <div className="rounded-lg bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700">
          Downloads used: {used}{product.downloadLimit > 0 ? ` / ${product.downloadLimit}` : " (unlimited)"}
        </div>
      </div>

      {assets.length > 0 && (
        <div className="card mt-8 p-6">
          <h2 className="text-lg font-bold">📁 Your files</h2>
          <p className="mt-1 text-xs text-slate-500">Each download uses a secure link valid for 10 minutes.</p>
          <ul className="mt-4 divide-y divide-slate-100">
            {assets.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium">{a.fileName}</p>
                  <p className="text-xs text-slate-500">{a.fileType.toUpperCase()} · {formatBytes(a.fileSize)}</p>
                </div>
                <DownloadButton assetId={a.id} fileName={a.fileName} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {lectures.length > 0 && (
        <div className="card mt-8 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">🎬 Lectures</h2>
            <span className="badge bg-indigo-100 text-indigo-700">
              {completedCount}/{lectures.length} completed · {lectures.length ? Math.round((completedCount / lectures.length) * 100) : 0}%
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all"
              style={{ width: `${lectures.length ? (completedCount / lectures.length) * 100 : 0}%` }}
            />
          </div>
          {[...chapters.entries()].map(([chapter, list]) => (
            <div key={chapter} className="mt-5">
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">{chapter}</p>
              <ul className="mt-2 divide-y divide-slate-100">
                {list.map((l) => {
                  const done = doneSet.has(l.id);
                  return (
                    <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div className="flex items-center gap-3">
                        <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${done ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                          {done ? "✓" : "▶"}
                        </span>
                        <div>
                          <p className={`text-sm font-medium ${done ? "text-slate-400 line-through" : "text-slate-800"}`}>{l.title}</p>
                          <p className="text-xs text-slate-500">{l.provider}{l.duration ? ` · ${l.duration}` : ""}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a href={l.externalUrl} target="_blank" rel="noopener noreferrer" className="btn-primary !py-1.5 !text-xs">▶ Watch</a>
                        <form action={toggleLectureComplete.bind(null, l.id, productId, !done)}>
                          <SubmitButton className="btn-secondary !py-1.5 !text-xs" pendingText="…">
                            {done ? "Mark incomplete" : "Mark complete"}
                          </SubmitButton>
                        </form>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      {assets.length === 0 && lectures.length === 0 && (
        <div className="card mt-8 p-12 text-center text-slate-500">No content has been attached to this product yet.</div>
      )}
    </div>
  );
}

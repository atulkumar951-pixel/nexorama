import { db } from "@/db";
import { banners } from "@/db/schema";
import { desc } from "drizzle-orm";
import ActionForm from "@/components/ActionForm";
import { saveBannerAction, toggleBannerAction } from "@/lib/actions/admin-actions";
import { SubmitButton } from "@/components/client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Banners" };

export default async function AdminBannersPage() {
  const rows = await db.select().from(banners).orderBy(desc(banners.priority), desc(banners.createdAt));

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <div>
        <h1 className="text-2xl font-bold">Banners</h1>
        <div className="mt-6 space-y-3">
          {rows.map((b) => (
            <div key={b.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-bold">{b.title} <span className="badge ml-1 bg-indigo-100 text-indigo-700">{b.position}</span></p>
                <p className="text-sm text-slate-500">{b.subtitle}</p>
                <p className="text-xs text-slate-400">Priority {b.priority} · {b.buttonText ? `CTA: ${b.buttonText} → ${b.buttonUrl}` : "No CTA"}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`badge ${b.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                  {b.isActive ? "Live" : "Hidden"}
                </span>
                <form action={toggleBannerAction.bind(null, b.id, !b.isActive)}>
                  <SubmitButton className="text-xs font-semibold text-indigo-600 hover:underline" pendingText="…">
                    {b.isActive ? "Hide" : "Show"}
                  </SubmitButton>
                </form>
              </div>
            </div>
          ))}
          {rows.length === 0 && <div className="card p-8 text-center text-slate-400">No banners yet.</div>}
        </div>
      </div>
      <div className="card h-fit p-6">
        <h2 className="font-bold">Create banner</h2>
        <div className="mt-4">
          <ActionForm action={saveBannerAction} submitLabel="Create banner">
            <div>
              <label className="label">Title *</label>
              <input name="title" required className="input" />
            </div>
            <div>
              <label className="label">Subtitle</label>
              <input name="subtitle" className="input" />
            </div>
            <div>
              <label className="label">Image URL (hero background)</label>
              <input name="image" className="input" placeholder="/images/hero.jpg" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Button text</label>
                <input name="buttonText" className="input" placeholder="Shop now" />
              </div>
              <div>
                <label className="label">Button URL</label>
                <input name="buttonUrl" className="input" placeholder="/products" />
              </div>
              <div>
                <label className="label">Position</label>
                <select name="position" className="input">
                  <option value="PROMO">Promo section</option>
                  <option value="HERO">Homepage hero</option>
                </select>
              </div>
              <div>
                <label className="label">Priority</label>
                <input name="priority" type="number" defaultValue={0} className="input" />
              </div>
            </div>
          </ActionForm>
        </div>
      </div>
    </div>
  );
}

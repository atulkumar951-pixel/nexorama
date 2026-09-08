import { db } from "@/db";
import { coupons } from "@/db/schema";
import { desc } from "drizzle-orm";
import { formatDate, formatINR } from "@/lib/format";
import ActionForm from "@/components/ActionForm";
import { saveCouponAction, toggleCouponAction } from "@/lib/actions/admin-actions";
import { SubmitButton } from "@/components/client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Coupons" };

export default async function AdminCouponsPage() {
  const rows = await db.select().from(coupons).orderBy(desc(coupons.createdAt));

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <div>
        <h1 className="text-2xl font-bold">Coupons</h1>
        <div className="card mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Discount</th>
                <th className="px-4 py-3">Min / Cap</th>
                <th className="px-4 py-3">Used</th>
                <th className="px-4 py-3">Expires</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-mono font-bold">{c.code}</td>
                  <td className="px-4 py-3">{c.type === "PERCENT" ? `${c.value}%` : formatINR(c.value)}</td>
                  <td className="px-4 py-3 text-slate-500">{formatINR(c.minOrder)} / {c.maxDiscount ? formatINR(c.maxDiscount) : "—"}</td>
                  <td className="px-4 py-3">{c.usedCount}{c.usageLimit ? `/${c.usageLimit}` : ""}</td>
                  <td className="px-4 py-3 text-slate-500">{c.expiresAt ? formatDate(c.expiresAt) : "Never"}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${c.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                      {c.isActive ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <form action={toggleCouponAction.bind(null, c.id, !c.isActive)}>
                      <SubmitButton className="text-xs font-semibold text-indigo-600 hover:underline" pendingText="…">
                        {c.isActive ? "Disable" : "Enable"}
                      </SubmitButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="p-8 text-center text-slate-400">No coupons yet.</p>}
        </div>
      </div>
      <div className="card h-fit p-6">
        <h2 className="font-bold">Create coupon</h2>
        <div className="mt-4">
          <ActionForm action={saveCouponAction} submitLabel="Create coupon">
            <div>
              <label className="label">Code *</label>
              <input name="code" required className="input uppercase" placeholder="WELCOME20" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Type</label>
                <select name="type" className="input">
                  <option value="PERCENT">Percentage %</option>
                  <option value="FIXED">Fixed ₹</option>
                </select>
              </div>
              <div>
                <label className="label">Value *</label>
                <input name="value" type="number" min={1} required className="input" placeholder="20" />
              </div>
              <div>
                <label className="label">Min order ₹</label>
                <input name="minOrder" type="number" min={0} defaultValue={0} className="input" />
              </div>
              <div>
                <label className="label">Max discount ₹</label>
                <input name="maxDiscount" type="number" min={1} className="input" placeholder="100" />
              </div>
              <div>
                <label className="label">Usage limit</label>
                <input name="usageLimit" type="number" min={1} className="input" placeholder="∞" />
              </div>
              <div>
                <label className="label">Per-user limit</label>
                <input name="perUserLimit" type="number" min={1} defaultValue={1} className="input" />
              </div>
            </div>
            <div>
              <label className="label">Expiry date</label>
              <input name="expiresAt" type="date" className="input" />
            </div>
          </ActionForm>
        </div>
      </div>
    </div>
  );
}

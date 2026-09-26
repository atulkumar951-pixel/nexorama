import Link from "next/link";
import { formatDate, formatINR } from "@/lib/format";
import {
  giftAdminApi,
  GiftAdminApiError,
  type GiftAdminDashboard,
  type GiftAdminModeConfig,
} from "@/lib/gift-admin-api";
import { ModeSwitcher } from "./gift-actions-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Gift Codes" };

export default async function AdminGiftDashboardPage() {
  let dashboard: GiftAdminDashboard | null = null;
  let modeConfig: GiftAdminModeConfig | null = null;
  let error: string | null = null;

  try {
    [dashboard, modeConfig] = await Promise.all([
      giftAdminApi<GiftAdminDashboard>("/dashboard"),
      giftAdminApi<GiftAdminModeConfig>("/settings/mode"),
    ]);
  } catch (err) {
    error = err instanceof GiftAdminApiError ? err.message : "Failed to load the Gift Codes module.";
  }

  if (error || !dashboard || !modeConfig) {
    return (
      <div>
        <h1 className="text-2xl font-bold">Gift Codes</h1>
        <div className="card mt-6 border border-red-200 bg-red-50 p-6">
          <p className="font-semibold text-red-700">Gift Codes module unavailable</p>
          <p className="mt-2 text-sm text-red-600">{error}</p>
          <ul className="mt-3 list-inside list-disc text-sm text-red-600">
            <li>Ensure the backend is deployed/running and set GIFT_API_URL on this app.</li>
            <li>Set GIFT_ADMIN_EMAIL / GIFT_ADMIN_PASSWORD to a backend admin (seeded: admin@example.com).</li>
          </ul>
        </div>
      </div>
    );
  }

  const c = dashboard.cards;
  const cards = [
    { label: "Gift Revenue", value: formatINR(c.giftCodeRevenue), icon: "💰", accent: "bg-emerald-500" },
    { label: "Gift Orders", value: c.giftCodeOrders, icon: "🧾", accent: "bg-indigo-500" },
    { label: "Active Products", value: `${c.activeProducts}/${c.totalGiftProducts}`, icon: "🎁", accent: "bg-amber-500" },
    { label: "Codes Available", value: c.availableCodes, icon: "🔑", accent: "bg-blue-500" },
    { label: "Codes Reserved", value: c.reservedCodes, icon: "⏳", accent: "bg-violet-500" },
    { label: "Codes Sold", value: c.soldCodes, icon: "✅", accent: "bg-cyan-500" },
    { label: "Pending Delivery", value: c.pendingDelivery, icon: "📤", accent: "bg-orange-500" },
    { label: "Delivered Today", value: c.deliveredToday, icon: "📬", accent: "bg-teal-500" },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Gift Codes</h1>
          <p className="mt-1 text-sm text-slate-500">
            Marketplace mode:{" "}
            <span className={`badge ${modeConfig.mode === "GIFT_CODES" ? "bg-amber-100 text-amber-700" : "bg-indigo-100 text-indigo-700"}`}>
              {modeConfig.mode === "GIFT_CODES" ? "Gift Codes" : "Digital Products"}
            </span>{" "}
            · delivery target {modeConfig.settings.deliveryTargetMinutes} min · reservations{" "}
            {modeConfig.settings.reservationMinutes} min
          </p>
        </div>
        <ModeSwitcher mode={modeConfig.mode} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="card flex items-center gap-3 p-4">
            <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.accent} text-lg text-white`}>
              {card.icon}
            </span>
            <div>
              <p className="text-xl font-extrabold">{card.value}</p>
              <p className="text-xs text-slate-500">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/nexora/gift-cards/inventory" className="btn-primary">
          🔑 Inventory
        </Link>
        <Link href="/nexora/gift-cards/deliveries" className="btn-secondary">
          📤 Delivery Queue {dashboard.sla.open > 0 && `(${dashboard.sla.open})`}
        </Link>
      </div>


      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-bold">Delivery SLA</h2>
          <div className="mt-3 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xl font-extrabold">{dashboard.sla.open}</p>
              <p className="text-xs text-slate-500">Open</p>
            </div>
            <div className="rounded-lg bg-red-50 p-3">
              <p className="text-xl font-extrabold text-red-600">{dashboard.sla.overdue}</p>
              <p className="text-xs text-slate-500">Overdue</p>
            </div>
            <div className="rounded-lg bg-amber-50 p-3">
              <p className="text-xl font-extrabold text-amber-600">{dashboard.alerts.expiringSoon}</p>
              <p className="text-xs text-slate-500">Codes expiring ≤30d</p>
            </div>
          </div>
          {dashboard.sla.oldestPending && (
            <p className="mt-3 text-sm text-slate-600">
              Oldest pending: <span className="font-semibold">{dashboard.sla.oldestPending.orderNumber}</span>
              {dashboard.sla.oldestPending.paidAt && <> · paid {formatDate(dashboard.sla.oldestPending.paidAt)}</>}
            </p>
          )}
          <p className="mt-2 text-xs text-slate-400">
            Manual review: {dashboard.alerts.manualReview} · expired codes: {c.expiredCodes} · assigned: {c.assignedCodes}
          </p>
        </div>

        <div className="card overflow-x-auto">
          <div className="border-b border-slate-100 p-4">
            <h2 className="font-bold">Low stock alerts</h2>
          </div>
          {dashboard.alerts.lowStock.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-400">
              All published products are above their low-stock threshold.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2">Product</th>
                  <th className="px-4 py-2">Sellable</th>
                  <th className="px-4 py-2">Threshold</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dashboard.alerts.lowStock.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      <span className="font-semibold">{p.name}</span> <span className="text-slate-400">· {p.brandName}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="badge bg-red-100 text-red-700">{p.sellable} left</span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">{p.threshold}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

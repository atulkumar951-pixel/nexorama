"use client";

import { useState, useTransition } from "react";
import { setMarketplaceModeAction, saveOperationalSettingsAction } from "@/lib/actions/gift-admin-actions";
import type { MarketplaceMode } from "@/lib/marketplace-mode";

interface SettingsClientProps {
  initialMode: MarketplaceMode;
  initialSettings: {
    reservationMinutes: number;
    lowStockThreshold: number;
    maxQtyPerOrder: number;
    deliveryTargetMinutes: number;
    couponSupport: boolean;
    giftPurchaseEnabled: boolean;
  };
}

export default function SettingsClient({ initialMode, initialSettings }: SettingsClientProps) {
  const [currentMode, setCurrentMode] = useState<MarketplaceMode>(initialMode);
  const [targetMode, setTargetMode] = useState<MarketplaceMode | null>(null);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Operational settings state
  const [settings, setSettings] = useState(initialSettings);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const [isSavingSettings, startSavingSettings] = useTransition();

  const handleSaveParameters = () => {
    startSavingSettings(async () => {
      setMessage(null);
      const fd = new FormData();
      fd.append("reservationMinutes", String(settings.reservationMinutes));
      fd.append("lowStockThreshold", String(settings.lowStockThreshold));
      fd.append("deliveryTargetMinutes", String(settings.deliveryTargetMinutes));
      fd.append("maxQtyPerOrder", String(settings.maxQtyPerOrder));

      const res = await saveOperationalSettingsAction({}, fd);
      if (res.success) {
        setSettingsSaved(true);
        setTimeout(() => setSettingsSaved(false), 3000);
      } else if (res.error) {
        setMessage({ type: "error", text: res.error });
      }
    });
  };

  const confirmSwitch = () => {
    if (!targetMode || targetMode === currentMode) return;

    startTransition(async () => {
      setMessage(null);
      const fd = new FormData();
      fd.append("mode", targetMode);
      const res = await setMarketplaceModeAction({}, fd);
      if (res.error) {
        setMessage({ type: "error", text: res.error });
        setTargetMode(null);
      } else {
        setCurrentMode(targetMode);
        setMessage({
          type: "success",
          text: `Marketplace mode switched successfully to ${
            targetMode === "GIFT_CODES" ? "Gift Codes Mode" : "Digital Marketplace"
          }! Redirecting…`,
        });
        setTargetMode(null);
        // Direct automatic redirection to the respective product suite
        if (targetMode === "GIFT_CODES") {
          window.location.href = "/nexora/gift-cards/products";
        } else {
          window.location.href = "/nexora/products";
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`rounded-xl border p-4 text-sm font-medium ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message.type === "success" ? "✓ " : "✕ "}
          {message.text}
        </div>
      )}

      {/* PRD §2, §79, §107: Master Marketplace Mode Toggle */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Master Marketplace Mode</h2>
            <p className="mt-1 text-sm text-slate-500">
              Only ONE mode is active for customers at a time. The active mode controls what products, navigation,
              and storefront users see.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold ${
                currentMode === "GIFT_CODES"
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : "bg-blue-100 text-blue-800 border border-blue-300"
              }`}
            >
              {currentMode === "GIFT_CODES" ? "🟢 GIFT CODES ACTIVE" : "🔵 DIGITAL MARKETPLACE ACTIVE"}
            </span>
            {currentMode === "GIFT_CODES" ? (
              <a
                href="/nexora/gift-cards/products"
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
              >
                🎁 Go to Gift Products &amp; Codes Adder →
              </a>
            ) : (
              <a
                href="/nexora/products"
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
              >
                📚 Go to Digital Products →
              </a>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {/* Option 1: Digital Marketplace */}
          <div
            onClick={() => currentMode !== "DIGITAL" && setTargetMode("DIGITAL")}
            className={`relative flex cursor-pointer flex-col rounded-xl border p-5 transition ${
              currentMode === "DIGITAL"
                ? "border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-500/20"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📚</span>
                <div>
                  <h3 className="font-bold text-slate-900">Digital Marketplace</h3>
                  <p className="text-xs text-slate-500">PDFs, Documents, eBooks, Courses</p>
                </div>
              </div>
              <input
                type="radio"
                name="marketplace_mode"
                checked={currentMode === "DIGITAL"}
                onChange={() => setTargetMode("DIGITAL")}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
              />
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-600">
              Users browse educational files, download notes with tokenized temporary links, and access their personal
              library.
            </p>
            {currentMode !== "DIGITAL" && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setTargetMode("DIGITAL");
                }}
                className="mt-4 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
              >
                Switch to Digital Marketplace
              </button>
            )}
          </div>

          {/* Option 2: Gift Codes */}
          <div
            onClick={() => currentMode !== "GIFT_CODES" && setTargetMode("GIFT_CODES")}
            className={`relative flex cursor-pointer flex-col rounded-xl border p-5 transition ${
              currentMode === "GIFT_CODES"
                ? "border-emerald-600 bg-emerald-50/40 ring-2 ring-emerald-500/20"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎁</span>
                <div>
                  <h3 className="font-bold text-slate-900">Gift Codes Mode</h3>
                  <p className="text-xs text-slate-500">Gaming, Shopping, OTT, Vouchers</p>
                </div>
              </div>
              <input
                type="radio"
                name="marketplace_mode"
                checked={currentMode === "GIFT_CODES"}
                onChange={() => setTargetMode("GIFT_CODES")}
                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
              />
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-600">
              Users purchase brand vouchers and gift cards. Raw codes are never revealed on the site; ops team manually
              emails codes upon verified payment within 5 minutes.
            </p>
            {currentMode !== "GIFT_CODES" && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setTargetMode("GIFT_CODES");
                }}
                className="mt-4 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
              >
                Switch to Gift Codes Mode
              </button>
            )}
          </div>
        </div>

        <div className="mt-5 rounded-lg border border-slate-100 bg-slate-50 p-4 text-xs text-slate-600">
          <p className="font-semibold text-slate-800">🛡️ Data Safety Guarantee (PRD §5):</p>
          <p className="mt-1">
            Switching modes does <strong>NOT</strong> delete any products, gift codes, orders, user accounts, files, or
            financial records. It only toggles the active customer-facing storefront and valid checkout pipelines.
            Admin panel remains fully accessible at all times.
          </p>
        </div>
      </div>

      {/* PRD §106: Gift Codes Operational Parameters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Gift Codes Operational Parameters</h2>
        <p className="mt-1 text-sm text-slate-500">
          Configure cart inventory reservation, low stock notifications, delivery SLA targets, and purchasing rules.
        </p>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Cart Reservation Duration (Minutes)
            </label>
            <input
              type="number"
              min="1"
              max="60"
              value={settings.reservationMinutes}
              onChange={(e) => setSettings({ ...settings, reservationMinutes: Number(e.target.value) })}
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <p className="mt-1 text-xs text-slate-500">
              Temporary inventory lock time when users add gift cards to their cart (PRD §23, default: 10 mins).
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Low Stock Alert Threshold
            </label>
            <input
              type="number"
              min="1"
              value={settings.lowStockThreshold}
              onChange={(e) => setSettings({ ...settings, lowStockThreshold: Number(e.target.value) })}
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <p className="mt-1 text-xs text-slate-500">
              Trigger "LOW STOCK" badge on product when available inventory drops below this number (PRD §94).
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Delivery Target (Minutes)
            </label>
            <input
              type="number"
              min="1"
              value={settings.deliveryTargetMinutes}
              onChange={(e) => setSettings({ ...settings, deliveryTargetMinutes: Number(e.target.value) })}
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <p className="mt-1 text-xs text-slate-500">
              Target manual email delivery SLA shown to user (PRD §17: "within 5 minutes"). Orders exceeding this are
              flagged OVERDUE.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Max Quantity Per Order
            </label>
            <input
              type="number"
              min="1"
              value={settings.maxQtyPerOrder}
              onChange={(e) => setSettings({ ...settings, maxQtyPerOrder: Number(e.target.value) })}
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <p className="mt-1 text-xs text-slate-500">
              Safety limit to mitigate fraud on high-value voucher orders (PRD §26).
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-6">
          {settingsSaved ? (
            <span className="text-xs font-semibold text-emerald-600">✓ Settings saved successfully.</span>
          ) : (
            <span />
          )}
          <button
            type="button"
            disabled={isSavingSettings}
            onClick={handleSaveParameters}
            className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition disabled:opacity-60"
          >
            {isSavingSettings ? "Saving…" : "Save Parameters"}
          </button>
        </div>
      </div>

      {/* PRD §79: Switch Confirmation Modal */}
      {targetMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-2xl text-amber-600">
              ⚠️
            </div>
            <h3 className="mt-4 text-lg font-bold text-slate-900">
              Switch to {targetMode === "GIFT_CODES" ? "Gift Codes Mode" : "Digital Marketplace"}?
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              {targetMode === "GIFT_CODES" ? (
                <>
                  You are switching Nexora to <strong>Gift Codes Mode</strong>. The Digital Marketplace will no longer
                  be available for new purchases to customers. Customers will only see Gift Cards and Vouchers.
                </>
              ) : (
                <>
                  You are switching Nexora to <strong>Digital Marketplace Mode</strong>. The Gift Codes storefront will
                  be hidden from users. Customers will browse PDFs, notes, documents, and courses.
                </>
              )}
            </p>
            <div className="mt-3 rounded-lg bg-slate-100 p-3 text-xs text-slate-500">
              ✓ No products, orders, users or codes will be deleted.
              <br />✓ Changes take effect immediately without server restart.
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setTargetMode(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={confirmSwitch}
                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white shadow transition ${
                  targetMode === "GIFT_CODES"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                {isPending ? "Switching..." : `Confirm Switch to ${targetMode === "GIFT_CODES" ? "Gift Codes" : "Digital"}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

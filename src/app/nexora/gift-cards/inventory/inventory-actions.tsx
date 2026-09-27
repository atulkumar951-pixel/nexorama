"use client";

import { useState, useTransition } from "react";
import {
  addSingleCodeAction,
  bulkImportCodesAction,
  revealGiftCodeAction,
  type GiftAdminFormState,
} from "@/lib/actions/gift-admin-actions";

interface ProductOption {
  id: string;
  name: string;
  brandName: string;
  denomination: string;
}

export function InventoryActionButtons({ products }: { products: ProductOption[] }) {
  const [showSingleModal, setShowSingleModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setShowSingleModal(true)}
        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
      >
        + Add Single Code
      </button>
      <button
        onClick={() => setShowBulkModal(true)}
        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
      >
        📁 Bulk CSV Import
      </button>

      {showSingleModal && (
        <SingleCodeModal products={products} onClose={() => setShowSingleModal(false)} />
      )}

      {showBulkModal && (
        <BulkImportModal products={products} onClose={() => setShowBulkModal(false)} />
      )}
    </div>
  );
}

function SingleCodeModal({
  products,
  onClose,
}: {
  products: ProductOption[];
  onClose: () => void;
}) {
  const [state, setState] = useState<GiftAdminFormState>({});
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await addSingleCodeAction({}, fd);
      setState(res);
      if (res.success) {
        setTimeout(onClose, 1500);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-slate-900">Add Individual Gift Code</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        {state.error && <div className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">{state.error}</div>}
        {state.success && <div className="mt-3 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700 border border-emerald-200">{state.success}</div>}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700">Select Gift Product *</label>
            <select
              name="giftProductId"
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            >
              <option value="">-- Choose Product --</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.brandName} - {p.name} (₹{p.denomination})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Gift Code (Plaintext) *</label>
            <input
              type="text"
              name="code"
              required
              placeholder="e.g. ABCD-1234-EFGH-5678"
              className="mt-1 w-full font-mono rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-slate-400">Code is encrypted at rest using AES-256-GCM.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Expiry Date (Optional)</label>
              <input
                type="date"
                name="expiryDate"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Batch / Label (Optional)</label>
              <input
                type="text"
                name="batchLabel"
                placeholder="e.g. Sept Batch A"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Internal Note</label>
            <input
              type="text"
              name="internalNote"
              placeholder="Optional admin note..."
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="mt-5 flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition"
            >
              {isPending ? "Adding…" : "Save Code"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BulkImportModal({
  products,
  onClose,
}: {
  products: ProductOption[];
  onClose: () => void;
}) {
  const [state, setState] = useState<GiftAdminFormState>({});
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await bulkImportCodesAction({}, fd);
      setState(res);
      if (res.success) {
        setTimeout(onClose, 2000);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-slate-900">Bulk CSV Import Codes</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        {state.error && <div className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">{state.error}</div>}
        {state.success && <div className="mt-3 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700 border border-emerald-200">{state.success}</div>}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700">Select Gift Product *</label>
            <select
              name="giftProductId"
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            >
              <option value="">-- Choose Product --</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.brandName} - {p.name} (₹{p.denomination})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Batch Label</label>
            <input
              type="text"
              name="batchLabel"
              placeholder="e.g. October Batch 1"
              defaultValue="Bulk Import"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">CSV Data (Paste Rows) *</label>
            <p className="text-[11px] text-slate-400">
              Format: <code>code,expiry(YYYY-MM-DD),notes</code> or one code per line. Header row is automatically detected.
            </p>
            <textarea
              name="csvContent"
              required
              rows={8}
              placeholder={`code,expiry,notes\nXXXX-XXXX-1111,2027-01-01,Batch A\nXXXX-XXXX-2222,2027-01-01,Batch A\nXXXX-XXXX-3333,2027-02-01,Batch B`}
              className="mt-1 w-full font-mono text-xs rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="mt-5 flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition"
            >
              {isPending ? "Validating & Importing…" : "Import Codes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Button & Modal to securely reveal a raw gift code with audit log (PRD §42, §73).
 */
export function RevealCodeButton({ codeId, maskedCode }: { codeId: string; maskedCode: string }) {
  const [open, setOpen] = useState(false);
  const [rawCode, setRawCode] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  const handleReveal = () => {
    startTransition(async () => {
      const res = await revealGiftCodeAction(Number(codeId));
      if (res.rawCode) {
        setRawCode(res.rawCode);
      }
    });
  };

  const copyToClipboard = () => {
    if (!rawCode) return;
    navigator.clipboard.writeText(rawCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
          handleReveal();
        }}
        className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 hover:underline"
      >
        👁️ View Code
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-xl text-emerald-600">
              🔑
            </div>
            <h3 className="mt-3 text-base font-bold text-slate-900">Secure Gift Code</h3>
            <p className="mt-1 text-xs text-slate-500">
              Action is recorded in audit logs (RAW_CODE_VIEWED).
            </p>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              {isPending ? (
                <p className="text-xs text-slate-500">Decrypting code...</p>
              ) : rawCode ? (
                <p className="font-mono text-base font-bold text-slate-900 select-all tracking-wider">
                  {rawCode}
                </p>
              ) : (
                <p className="text-xs text-red-600">Failed to load code.</p>
              )}
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={copyToClipboard}
                disabled={!rawCode}
                className="flex-1 rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition"
              >
                {copied ? "✓ Copied!" : "📋 Copy Code"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setRawCode(null);
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

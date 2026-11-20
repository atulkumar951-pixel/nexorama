"use client";

import { useState, useTransition } from "react";
import {
  markDeliveriesSentAction,
  replaceGiftCodeAction,
  revealGiftCodeAction,
  type GiftAdminFormState,
} from "@/lib/actions/gift-admin-actions";

interface DeliveryRowActionsProps {
  deliveryId: string;
  orderNumber: string;
  recipientEmail: string;
  deliveryStatus: string;
  sentAt: string | null;
  giftCodeId?: string;
  maskedCode: string;
}

export function DeliveryRowActions({
  deliveryId,
  orderNumber,
  recipientEmail,
  deliveryStatus,
  sentAt,
  giftCodeId,
  maskedCode,
}: DeliveryRowActionsProps) {
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [showSentModal, setShowSentModal] = useState(false);

  const [rawCode, setRawCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [actionState, setActionState] = useState<GiftAdminFormState>({});
  const [replaceReason, setReplaceReason] = useState("");
  const [adminNote, setAdminNote] = useState("Sent to customer registered email.");

  const handleReveal = () => {
    if (!giftCodeId) return;
    setShowCodeModal(true);
    startTransition(async () => {
      const res = await revealGiftCodeAction(Number(giftCodeId));
      if (res.rawCode) setRawCode(res.rawCode);
    });
  };

  const handleMarkSent = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await markDeliveriesSentAction([deliveryId], adminNote);
      setActionState(res);
      if (res.success) {
        setTimeout(() => setShowSentModal(false), 1200);
      }
    });
  };

  const handleReplace = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await replaceGiftCodeAction(Number(deliveryId), replaceReason);
      setActionState(res);
      if (res.success) {
        setTimeout(() => setShowReplaceModal(false), 1200);
      }
    });
  };

  const copyToClipboard = () => {
    if (!rawCode) return;
    navigator.clipboard.writeText(rawCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (deliveryStatus === "SENT") {
    return (
      <div className="text-right">
        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
          ✓ Sent
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      {/* Reveal assigned code button */}
      <button
        type="button"
        onClick={handleReveal}
        className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition"
        title="View assigned raw code to email customer"
      >
        👁️ View Code
      </button>

      {/* Mark as sent button */}
      <button
        type="button"
        onClick={() => setShowSentModal(true)}
        className="rounded bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
      >
        Mark Sent
      </button>

      {/* Replace code button */}
      <button
        type="button"
        onClick={() => setShowReplaceModal(true)}
        className="rounded text-xs text-slate-400 hover:text-red-600 p-1"
        title="Replace faulty code"
      >
        🔄
      </button>

      {/* View Code Modal */}
      {showCodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl">
              🔑
            </div>
            <h3 className="mt-3 text-base font-bold text-slate-900">Assigned Gift Code</h3>
            <p className="text-xs text-slate-500 mt-1">
              Order #{orderNumber.replace(/-/g, "")} · {recipientEmail}
            </p>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              {isPending ? (
                <p className="text-xs text-slate-500">Decrypting code...</p>
              ) : rawCode ? (
                <p className="font-mono text-base font-bold text-slate-900 select-all tracking-wider">
                  {rawCode}
                </p>
              ) : (
                <p className="text-xs text-slate-400">Masked: {maskedCode}</p>
              )}
            </div>
            <p className="mt-2 text-[10px] text-slate-400">
              Viewing raw code has been recorded in the platform audit log.
            </p>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={copyToClipboard}
                disabled={!rawCode}
                className="flex-1 rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition"
              >
                {copied ? "✓ Copied to Clipboard!" : "📋 Copy Code"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCodeModal(false);
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

      {/* Mark Sent Modal */}
      {showSentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">Confirm Code Email Dispatch</h3>
            <p className="mt-1 text-xs text-slate-500">
              Confirm that the assigned code for Order <strong>#{orderNumber.replace(/-/g, "")}</strong> was manually emailed to{" "}
              <strong>{recipientEmail}</strong>.
            </p>

            {actionState.error && (
              <div className="mt-3 rounded-lg bg-red-50 p-2 text-xs text-red-700">{actionState.error}</div>
            )}
            {actionState.success && (
              <div className="mt-3 rounded-lg bg-emerald-50 p-2 text-xs text-emerald-700">{actionState.success}</div>
            )}

            <form onSubmit={handleMarkSent} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Delivery Confirmation Note</label>
                <input
                  type="text"
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="e.g. Sent to customer email via Gmail"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSentModal(false)}
                  className="rounded-lg border border-slate-300 px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition"
                >
                  {isPending ? "Updating…" : "Confirm Marked Sent"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Replace Code Modal */}
      {showReplaceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">Replace Faulty Gift Code</h3>
            <p className="mt-1 text-xs text-slate-500">
              The currently assigned code ({maskedCode}) will be marked CANCELLED, and an available code will be assigned.
            </p>

            {actionState.error && (
              <div className="mt-3 rounded-lg bg-red-50 p-2 text-xs text-red-700">{actionState.error}</div>
            )}
            {actionState.success && (
              <div className="mt-3 rounded-lg bg-emerald-50 p-2 text-xs text-emerald-700">{actionState.success}</div>
            )}

            <form onSubmit={handleReplace} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Reason for Replacement *</label>
                <input
                  type="text"
                  required
                  value={replaceReason}
                  onChange={(e) => setReplaceReason(e.target.value)}
                  placeholder="e.g. Code reported invalid by recipient"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-red-500 focus:outline-none"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowReplaceModal(false)}
                  className="rounded-lg border border-slate-300 px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-lg bg-red-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition"
                >
                  {isPending ? "Replacing…" : "Confirm Replacement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

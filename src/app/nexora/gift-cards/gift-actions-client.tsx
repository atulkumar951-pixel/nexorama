"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/client";
import {
  markDeliveriesSentAction,
  setMarketplaceModeAction,
  type GiftAdminFormState,
} from "@/lib/actions/gift-admin-actions";

const INITIAL: GiftAdminFormState = {};

/** Marketplace mode switch (DIGITAL ↔ GIFT_CODES) with inline feedback. */
export function ModeSwitcher({ mode }: { mode: "DIGITAL" | "GIFT_CODES" }) {
  const [state, formAction, pending] = useActionState(
    async (prev: GiftAdminFormState, formData: FormData) => {
      const target = String(formData.get("mode") ?? "");
      const res = await setMarketplaceModeAction(prev, formData);
      if (res.success) {
        if (target === "DIGITAL") {
          window.location.href = "/nexora/products";
        } else {
          window.location.href = "/nexora/gift-cards/products";
        }
      }
      return res;
    },
    INITIAL,
  );

  return (
    <form action={formAction} className="space-y-2">
      <div className="flex items-center rounded-full bg-slate-200 p-1 text-xs font-semibold">
        <button
          type="submit"
          name="mode"
          value="DIGITAL"
          disabled={pending}
          className={`rounded-full px-3 py-1.5 transition ${
            mode === "DIGITAL" ? "bg-white text-slate-900 shadow" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Digital Products
        </button>
        <button
          type="submit"
          name="mode"
          value="GIFT_CODES"
          disabled={pending}
          className={`rounded-full px-3 py-1.5 transition ${
            mode === "GIFT_CODES" ? "bg-amber-500 text-white shadow" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          🎁 Gift Codes
        </button>
      </div>
      {pending && <p className="text-xs text-slate-500 animate-pulse">Switching mode…</p>}
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
      {state.success && <p className="text-xs text-emerald-600">{state.success}</p>}
    </form>
  );
}

/** Row action: mark one delivery as sent, with inline error feedback. */
export function MarkSentButton({ deliveryId }: { deliveryId: string }) {
  const [state, formAction] = useActionState(
    (_prev: GiftAdminFormState, formData: FormData) => {
      const note = formData.get("adminNote") ? String(formData.get("adminNote")) : undefined;
      return markDeliveriesSentAction([deliveryId], note);
    },
    INITIAL,
  );

  return (
    <div className="flex flex-col items-end gap-1">
      <form action={formAction}>
        <SubmitButton
          className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          pendingText="Saving…"
        >
          Mark sent
        </SubmitButton>
      </form>
      {state.error && <span className="max-w-[160px] text-right text-[11px] text-red-600">{state.error}</span>}
    </div>
  );
}
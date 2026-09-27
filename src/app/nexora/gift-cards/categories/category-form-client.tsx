"use client";

import { useActionState } from "react";
import { saveGiftCategoryAction, type GiftAdminFormState } from "@/lib/actions/gift-admin-actions";
import { SubmitButton } from "@/components/client";

const INITIAL: GiftAdminFormState = {};

export default function CategoryFormClient() {
  const [state, formAction] = useActionState(saveGiftCategoryAction, INITIAL);

  return (
    <form action={formAction} className="mt-4 space-y-4">
      {state.error && (
        <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">{state.error}</div>
      )}
      {state.success && (
        <div className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700 border border-emerald-200">
          {state.success}
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-slate-700">Category Name *</label>
        <input
          type="text"
          name="name"
          required
          placeholder="e.g. Gaming, Shopping, OTT"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700">Slug (Optional)</label>
        <input
          type="text"
          name="slug"
          placeholder="e.g. gaming, shopping"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700">Icon / Emoji</label>
        <input
          type="text"
          name="icon"
          placeholder="🎮, 🛍️, 🎬, 📱"
          defaultValue="🎁"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700">Description</label>
        <textarea
          name="description"
          rows={3}
          placeholder="Brief description of the category..."
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
        />
      </div>

      <SubmitButton
        className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
        pendingText="Creating Category…"
      >
        Create Category
      </SubmitButton>
    </form>
  );
}

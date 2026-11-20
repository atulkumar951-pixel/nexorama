"use client";

import { useState, useActionState, useTransition } from "react";
import {
  saveGiftProductAction,
  saveGiftCategoryAction,
  setGiftProductStatusAction,
  type GiftAdminFormState,
} from "@/lib/actions/gift-admin-actions";

export function CreateGiftProductForm({
  categories,
}: {
  categories: Array<{ id: string; name: string }>;
}) {
  const [imageUrl, setImageUrl] = useState("");
  const [state, formAction, pending] = useActionState<GiftAdminFormState, FormData>(
    saveGiftProductAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {state.error}
        </div>
      )}
      {state.success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
          {state.success}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-semibold text-gray-700">Brand Name *</label>
          <input
            type="text"
            name="brandName"
            required
            placeholder="e.g. Amazon, Steam"
            className="input mt-1 w-full text-xs"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-700">Product Name *</label>
          <input
            type="text"
            name="name"
            required
            placeholder="e.g. Amazon Pay ₹500 eGift Card"
            className="input mt-1 w-full text-xs"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="text-xs font-semibold text-gray-700">Category</label>
          <select name="categoryId" className="input mt-1 w-full text-xs">
            <option value="">Unassigned</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-700">Card Value (₹) *</label>
          <input
            type="number"
            name="denomination"
            min="1"
            step="1"
            required
            placeholder="500"
            className="input mt-1 w-full text-xs"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-700">Selling Price (₹) *</label>
          <input
            type="number"
            name="sellingPrice"
            min="1"
            step="0.01"
            required
            placeholder="490"
            className="input mt-1 w-full text-xs"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="text-xs font-semibold text-gray-700">Image URL</label>
          <input
            type="url"
            name="image"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://..."
            className="input mt-1 w-full text-xs"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-700">Initial Status</label>
          <select name="status" defaultValue="PUBLISHED" className="input mt-1 w-full text-xs">
            <option value="PUBLISHED">Published (Visible in store)</option>
            <option value="DRAFT">Draft (Hidden)</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-700">Homepage Position</label>
          <input
            type="number"
            name="sortOrder"
            min="0"
            placeholder="e.g. 1 (optional)"
            className="input mt-1 w-full text-xs"
            title="1 = first on homepage, 2 = second, etc."
          />
        </div>
      </div>

      {imageUrl.trim() && (
        <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-2.5">
          <p className="text-[11px] font-semibold text-gray-600 mb-1.5">Artwork Preview (Auto-Fitted Dimension)</p>
          <div className="relative aspect-[16/10] w-full max-w-[240px] overflow-hidden rounded-lg border border-gray-200 bg-slate-900/5 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl.trim()}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover blur-xl opacity-35 scale-110"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl.trim()}
              alt="Preview"
              className="relative z-10 max-h-full max-w-full w-auto h-auto object-contain p-2 drop-shadow-sm"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = "none";
              }}
            />
          </div>
        </div>
      )}

      <div>
        <label className="text-xs font-semibold text-gray-700">Description</label>
        <textarea
          name="description"
          rows={2}
          placeholder="Product details, features, terms…"
          className="input mt-1 w-full text-xs"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-700">Redemption Instructions</label>
        <textarea
          name="instructions"
          rows={2}
          placeholder="How the customer redeems this code once delivered via email…"
          className="input mt-1 w-full text-xs"
        />
      </div>

      <div className="flex flex-wrap gap-4 pt-1">
        <label className="flex items-center gap-2 text-xs text-gray-700">
          <input type="checkbox" name="featured" className="rounded border-gray-300" />
          <span>Feature on Gift storefront hero</span>
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-700">
          <input type="checkbox" name="allowCoupon" defaultChecked className="rounded border-gray-300" />
          <span>Allow coupon discounts</span>
        </label>
      </div>

      <button type="submit" disabled={pending} className="btn-primary text-xs disabled:opacity-60">
        {pending ? "Creating…" : "+ Create Gift Product"}
      </button>
    </form>
  );
}


export function CreateGiftCategoryForm() {
  const [state, formAction, pending] = useActionState<GiftAdminFormState, FormData>(
    saveGiftCategoryAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-3">
      {state.error && (
        <div className="rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">
          {state.error}
        </div>
      )}
      {state.success && (
        <div className="rounded border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-700">
          {state.success}
        </div>
      )}

      <div>
        <label className="text-xs font-semibold text-gray-700">Category Name *</label>
        <input
          type="text"
          name="name"
          required
          placeholder="Gaming, Streaming, Retail…"
          className="input mt-1 w-full text-xs"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-700">Icon / Emoji</label>
        <input
          type="text"
          name="icon"
          placeholder="🎮, 🎬, 🛍️"
          className="input mt-1 w-full text-xs"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-700">Description</label>
        <input
          type="text"
          name="description"
          placeholder="Short description…"
          className="input mt-1 w-full text-xs"
        />
      </div>

      <button type="submit" disabled={pending} className="btn-secondary text-xs disabled:opacity-60">
        {pending ? "Adding…" : "+ Add Category"}
      </button>
    </form>
  );
}

export function ProductStatusButton({
  productId,
  currentStatus,
}: {
  productId: string;
  currentStatus: string;
}) {
  const [pending, startTransition] = useTransition();

  const toggle = (nextStatus: "PUBLISHED" | "UNPUBLISHED") => {
    startTransition(async () => {
      await setGiftProductStatusAction(productId, nextStatus);
    });
  };

  if (currentStatus === "PUBLISHED") {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={() => toggle("UNPUBLISHED")}
        className="rounded bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50"
      >
        {pending ? "…" : "Unpublish"}
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => toggle("PUBLISHED")}
      className="rounded bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
    >
      {pending ? "…" : "Publish"}
    </button>
  );
}

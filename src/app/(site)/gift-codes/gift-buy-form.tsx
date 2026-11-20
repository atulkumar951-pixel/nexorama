"use client";

import { useState, useActionState } from "react";
import { placeGiftOrderAction, type GiftCheckoutState } from "@/lib/actions/gift-shop-actions";
import { formatINR } from "@/lib/format";

type Props = {
  product: {
    id: number;
    name: string;
    brandName: string;
    denomination: number;
    sellingPrice: number;
  };
  userEmail: string;
  maxQuantity?: number;
};

const initialState: GiftCheckoutState = {};

export function GiftBuyForm({ product, userEmail, maxQuantity = 5 }: Props) {
  const [quantity, setQuantity] = useState(1);
  const [state, action, pending] = useActionState(placeGiftOrderAction, initialState);
  const total = product.sellingPrice * quantity;

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="giftProductId" value={product.id} />
      <input type="hidden" name="quantity" value={quantity} />

      {/* Quantity Selector */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
          Quantity (Max {maxQuantity})
        </label>
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-xl border border-slate-300 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1 || pending}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white font-bold text-slate-700 shadow-sm hover:bg-slate-100 disabled:opacity-40"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="w-12 text-center text-sm font-bold text-slate-800">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
              disabled={quantity >= maxQuantity || pending}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white font-bold text-slate-700 shadow-sm hover:bg-slate-100 disabled:opacity-40"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {formatINR(product.sellingPrice)} each
          </span>
        </div>
      </div>

      {/* Recipient Email */}
      <div>
        <label htmlFor="recipientEmail" className="block text-sm font-semibold text-slate-700 mb-1">
          Recipient Email
        </label>
        <input
          id="recipientEmail"
          type="email"
          name="recipientEmail"
          defaultValue={userEmail}
          required
          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          placeholder="Enter email to receive the gift code"
        />
        <p className="mt-1 text-xs text-slate-500">The gift code will be delivered to this email address.</p>
      </div>

      {/* Reservation note (PRD §23, §59) */}
      <div className="flex items-center gap-2 rounded-xl bg-emerald-50/80 border border-emerald-200/80 px-3.5 py-2 text-xs text-emerald-800">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        <span>Inventory reserved for <strong>10 minutes</strong> upon proceeding to checkout.</span>
      </div>

      {state?.error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3.5 text-base font-bold text-white shadow-md shadow-emerald-200 hover:shadow-lg hover:shadow-emerald-300 hover:from-emerald-500 hover:to-teal-500 transition duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
        id="gift-buy-button"
      >
        {pending ? "Reserving & Processing…" : `Buy Now · ${formatINR(total)}`}
      </button>

      <p className="text-center text-xs text-slate-400">
        ⚡ Instant digital code delivery upon payment. If code sold out, if payment deducted it will refunded within 24-72 hrs.
      </p>
    </form>
  );
}

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
  userName?: string;
  userPhone?: string;
  maxQuantity?: number;
};

const initialState: GiftCheckoutState = {};

export function GiftBuyForm({
  product,
  userEmail,
  userName = "",
  userPhone = "",
  maxQuantity = 5,
}: Props) {
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

      {/* Customer Name */}
      <div>
        <label htmlFor="customerName" className="block text-sm font-semibold text-slate-700 mb-1">
          Full Name
        </label>
        <input
          id="customerName"
          type="text"
          name="customerName"
          defaultValue={userName}
          required
          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          placeholder="Enter your full name"
        />
      </div>

      {/* Customer Mobile */}
      <div>
        <label htmlFor="customerMobile" className="block text-sm font-semibold text-slate-700 mb-1">
          Mobile Number
        </label>
        <input
          id="customerMobile"
          type="tel"
          name="customerMobile"
          defaultValue={userPhone}
          required
          pattern="[0-9]{10}"
          maxLength={10}
          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          placeholder="Enter 10-digit mobile number"
        />
        <p className="mt-1 text-[11px] text-slate-400">Order SMS confirmation &amp; delivery updates.</p>
      </div>

      {/* Account Email (Non-editable) */}
      <div>
        <label htmlFor="recipientEmail" className="block text-sm font-semibold text-slate-700 mb-1">
          Email Address
        </label>
        <input
          id="recipientEmail"
          type="email"
          name="recipientEmail"
          defaultValue={userEmail}
          readOnly
          className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm text-slate-600 cursor-not-allowed select-none focus:outline-none"
        />
        <p className="mt-1 text-[11px] text-slate-400">
          The digital voucher code will be dispatched to this email immediately upon payment.
        </p>
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
        {pending ? "Processing…" : `Buy Now · ${formatINR(total)}`}
      </button>

      <p className="text-center text-xs text-slate-400">
        🔒 Secure payment via Razorpay · Instant digital delivery
      </p>
    </form>
  );
}

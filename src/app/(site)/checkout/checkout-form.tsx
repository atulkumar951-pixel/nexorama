"use client";

import { useActionState } from "react";
import { placeOrderAction, type CheckoutState } from "@/lib/actions/shop-actions";
import { SubmitButton } from "@/components/client";

export default function CheckoutForm() {
  const [state, action] = useActionState<CheckoutState, FormData>(placeOrderAction, {});

  return (
    <form action={action} className="card h-fit p-6">
      <h2 className="font-bold">Payment</h2>
      {state.error && <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{state.error}</div>}
      <div className="mt-4">
        <label className="label" htmlFor="coupon">Coupon code (optional)</label>
        <input id="coupon" name="coupon" className="input uppercase" placeholder="e.g. WELCOME20" />
      </div>
      <SubmitButton className="btn-primary mt-5 w-full !py-3" pendingText="Creating order…">
        Continue to Payment →
      </SubmitButton>
      <ul className="mt-4 space-y-1.5 text-xs text-slate-500">
        <li>🔒 Payments are processed securely via Razorpay.</li>
        <li>⚡ Access is granted instantly after verified payment.</li>
        <li>🧾 A full order record is stored in your account.</li>
      </ul>
    </form>
  );
}

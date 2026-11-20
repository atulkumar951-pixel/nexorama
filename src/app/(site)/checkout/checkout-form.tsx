"use client";

import { useActionState } from "react";
import { placeOrderAction, type CheckoutState } from "@/lib/actions/shop-actions";
import { SubmitButton } from "@/components/client";

export default function CheckoutForm({
  userEmail,
  userName,
}: {
  userEmail?: string;
  userName?: string;
}) {
  const [state, action] = useActionState<CheckoutState, FormData>(placeOrderAction, {});

  return (
    <form action={action} className="card h-fit p-6 space-y-4">
      <h2 className="font-bold text-lg">Billing Details</h2>
      {state.error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{state.error}</div>}

      <div>
        <label className="label" htmlFor="customerName">Full Name</label>
        <input
          id="customerName"
          name="customerName"
          className="input"
          defaultValue={userName || ""}
          required
          placeholder="Your full name"
        />
      </div>

      <div>
        <label className="label" htmlFor="customerMobile">Mobile Number</label>
        <input
          id="customerMobile"
          name="customerMobile"
          type="tel"
          pattern="[0-9]{10}"
          maxLength={10}
          className="input"
          required
          placeholder="10-digit mobile number"
        />
      </div>

      <div>
        <label className="label" htmlFor="customerEmail">Account Email</label>
        <input
          id="customerEmail"
          name="customerEmail"
          type="email"
          className="input bg-slate-100 text-slate-600 cursor-not-allowed select-none focus:outline-none"
          defaultValue={userEmail || ""}
          readOnly
        />
      </div>

      <div>
        <label className="label" htmlFor="coupon">Coupon code (optional)</label>
        <input id="coupon" name="coupon" className="input uppercase" placeholder="e.g. WELCOME20" />
      </div>

      <SubmitButton className="btn-primary w-full !py-3" pendingText="Creating order…">
        Continue to Payment →
      </SubmitButton>
      <ul className="space-y-1.5 text-xs text-slate-500">
        <li>🔒 Payments are processed securely via Razorpay.</li>
        <li>⚡ Access is granted instantly after verified payment.</li>
        <li>🧾 A full order record is stored in your account.</li>
      </ul>
    </form>
  );
}

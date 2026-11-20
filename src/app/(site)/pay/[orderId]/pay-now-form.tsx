"use client";

import { useState } from "react";
import { formatINR } from "@/lib/format";
import { simulatePayAction } from "@/lib/actions/shop-actions";

export function PayNowPolicyForm({
  orderNumber,
  total,
}: {
  orderNumber: string;
  total: number;
}) {
  const [accepted, setAccepted] = useState(false);
  const [pending, setPending] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    if (!accepted) {
      e.preventDefault();
      alert("You must accept all store policies and the no-refund / code risk disclaimer before proceeding.");
      return;
    }
    setPending(true);
  };

  return (
    <form action={simulatePayAction.bind(null, orderNumber)} onSubmit={handleSubmit} className="space-y-4">
      {/* Mandatory Policy Acceptance & Risk Disclosure */}
      <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/95 p-4 text-xs space-y-2.5 shadow-xs">
        <div className="flex items-center gap-2 font-bold text-amber-950">
          <span className="text-lg">⚠️</span>
          <span className="text-sm">Mandatory Policy Acceptance &amp; Risk Disclosure</span>
        </div>

        <div className="space-y-1.5 text-amber-900 leading-relaxed text-[11px]">
          <p>
            <strong>• Unconditional Policy Acceptance:</strong> By purchasing or paying for any product on Nexora, you explicitly confirm and agree that you accept all store policies, Terms &amp; Conditions, and Refund Policy in all circumstances without exception.
          </p>
          <p>
            <strong>• No Guarantee of Code Correctness (Buy at Your Own Risk):</strong> All digital voucher codes are provided strictly on an &ldquo;AS-IS&rdquo; basis with <strong>no guarantee of code correctness, validity, balance, or redemption ability</strong>. You purchase entirely at your own risk.
          </p>
          <p>
            <strong>• Strictly No Refunds:</strong> Absolutely <strong>no refund of any type will be made</strong> after a code has been processed or delivered under any condition, <strong>whether the code is right or wrong</strong>, valid or invalid, redeemed or unredeemed.
          </p>
        </div>

        {/* Checkbox */}
        <label className="flex items-start gap-2.5 pt-2 border-t border-amber-200 cursor-pointer select-none">
          <input
            type="checkbox"
            name="acceptPolicies"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            required
            className="mt-0.5 h-4 w-4 rounded border-amber-400 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
          />
          <span className="text-[11px] font-bold text-slate-900 leading-snug">
            I accept all store Policies, Terms &amp; Conditions, and Refund Policy. I acknowledge that purchasing any product means I unconditionally accept all terms, I am buying at my own risk with no guarantee of code correctness, and no refund will be provided under any condition whether the code is right or wrong.
          </span>
        </label>
      </div>

      <button
        type="submit"
        disabled={!accepted || pending}
        className="btn-primary w-full !py-3.5 text-base font-bold shadow-lg shadow-emerald-200 hover:shadow-emerald-300 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? (
          <>
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            <span>⚡ Completing payment &amp; releasing voucher code…</span>
          </>
        ) : (
          <span>⚡ Pay Now · {formatINR(total)}</span>
        )}
      </button>

      {!accepted && (
        <p className="text-center text-[11px] font-semibold text-amber-800">
          ⚠️ Please check the policy acceptance box above to proceed with payment.
        </p>
      )}
    </form>
  );
}

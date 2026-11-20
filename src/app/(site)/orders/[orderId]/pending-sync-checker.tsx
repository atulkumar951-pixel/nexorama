"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export function PendingSyncChecker({ orderIdentifier }: { orderIdentifier: string }) {
  const [checking, setChecking] = useState(false);
  const [msg, setMsg] = useState("");
  const router = useRouter();

  async function check() {
    setChecking(true);
    setMsg("Checking payment status directly with Razorpay...");
    try {
      const res = await fetch("/api/payment/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: orderIdentifier }),
      });
      const data = await res.json();
      if (data.paid) {
        setMsg("Payment confirmed! Unlocking your voucher code...");
        router.refresh();
      } else {
        setMsg("Payment is still pending on Razorpay. If you just paid, please allow a few seconds and tap again.");
      }
    } catch {
      setMsg("Could not check status right now. Please try again.");
    } finally {
      setChecking(false);
    }
  }

  // Auto-check once on mount and when returning to window
  useEffect(() => {
    check();
    const onVisibility = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  return (
    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-amber-900">
          Payment is currently marked PENDING.
        </p>
        <button
          type="button"
          onClick={check}
          disabled={checking}
          className="rounded-lg bg-amber-600 px-3 py-1.5 font-bold text-white hover:bg-amber-700 disabled:opacity-50 transition"
        >
          {checking ? "Checking Razorpay..." : "🔄 Check Payment Status"}
        </button>
      </div>
      <p className="text-amber-800">
        If money was deducted from your UPI or bank account, tap the button above to immediately verify with Razorpay and unlock your code.
      </p>
      {msg && <p className="font-semibold text-amber-950 mt-1">{msg}</p>}
    </div>
  );
}

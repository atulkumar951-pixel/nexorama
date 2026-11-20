"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export default function RazorpayButton({ orderIdentifier }: { orderIdentifier: string | number }) {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [paymentStarted, setPaymentStarted] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pollCountRef = useRef(0);

  async function loadScript(): Promise<boolean> {
    if (window.Razorpay) return true;
    return new Promise((resolve) => {
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.body.appendChild(s);
    });
  }

  const checkPaymentSync = useCallback(
    async (manual = false) => {
      if (manual) {
        setChecking(true);
        setStatusMsg("Checking payment status directly with Razorpay...");
        setError("");
      }
      try {
        const res = await fetch("/api/payment/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: orderIdentifier }),
        });
        const data = await res.json();
        if (data.paid) {
          setStatusMsg("Payment confirmed! Delivering your voucher code...");
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          router.push(`/orders/${data.orderNumber || orderIdentifier}?success=1`);
          return true;
        } else if (manual) {
          setStatusMsg("Payment not detected yet. If you completed UPI payment, please allow a few seconds and tap again.");
        }
      } catch (err: any) {
        if (manual) {
          setError(err.message || "Failed to sync payment status.");
        }
      } finally {
        if (manual) setChecking(false);
      }
      return false;
    },
    [orderIdentifier, router]
  );

  // Auto-sync listeners when payment has started (mobile tab switch / focus / polling)
  useEffect(() => {
    if (!paymentStarted) return;

    // Check immediately when user switches back to this browser tab from UPI app
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkPaymentSync(false);
      }
    };
    const onFocus = () => {
      checkPaymentSync(false);
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onFocus);

    // Polling every 3 seconds for up to 90 seconds (30 cycles)
    pollCountRef.current = 0;
    pollTimerRef.current = setInterval(async () => {
      pollCountRef.current += 1;
      const isPaid = await checkPaymentSync(false);
      if (isPaid || pollCountRef.current >= 30) {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      }
    }, 3000);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onFocus);
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [paymentStarted, checkPaymentSync]);

  async function pay() {
    setLoading(true);
    setError("");
    setStatusMsg("");
    try {
      const ok = await loadScript();
      if (!ok) throw new Error("Failed to load Razorpay checkout");

      const res = await fetch("/api/payment/razorpay-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: orderIdentifier }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to initialize payment order");

      setPaymentStarted(true);

      const rzp = new window.Razorpay!({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: data.name,
        description: data.description,
        order_id: data.razorpayOrderId,
        prefill: data.prefill,
        theme: { color: "#059669" },
        modal: {
          ondismiss: () => {
            // Check immediately on modal dismiss (e.g. user returns from UPI app)
            checkPaymentSync(false);
          },
        },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          setChecking(true);
          setStatusMsg("Verifying payment and releasing code...");
          try {
            const verify = await fetch("/api/payment/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(response),
            });
            const vd = await verify.json();
            if (verify.ok) {
              router.push(`/orders/${vd.orderNumber || vd.orderId}?success=1`);
            } else {
              // Fallback to direct REST sync if verify signature failed but payment went through
              const fallback = await checkPaymentSync(true);
              if (!fallback) {
                setError(vd.error ?? "Payment verification failed");
              }
            }
          } catch (verErr: any) {
            await checkPaymentSync(true);
          } finally {
            setChecking(false);
          }
        },
      });

      rzp.open();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed to start");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        onClick={pay}
        disabled={loading || checking}
        className="btn-primary w-full !py-3 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            <span>Opening Razorpay…</span>
          </>
        ) : paymentStarted ? (
          "Reopen Razorpay Checkout"
        ) : (
          "Pay securely with Razorpay"
        )}
      </button>

      {/* UPI / Status Verification Box */}
      {paymentStarted && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-950 space-y-2.5">
          <div className="flex items-center gap-2 font-semibold">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span>Awaiting UPI / Bank Confirmation</span>
          </div>
          <p className="text-emerald-800 leading-relaxed">
            If you switched to Google Pay, PhonePe, Paytm, or CRED to pay, return here after completing. Your gift voucher will unlock automatically.
          </p>

          <button
            type="button"
            onClick={() => checkPaymentSync(true)}
            disabled={checking}
            className="w-full rounded-lg bg-white border border-emerald-300 px-3 py-2 font-bold text-emerald-800 shadow-xs hover:bg-emerald-100 flex items-center justify-center gap-2 transition"
          >
            {checking ? (
              <>
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                <span>Checking payment with Razorpay...</span>
              </>
            ) : (
              "✓ Already paid on UPI? Tap to Check & Get Code"
            )}
          </button>
        </div>
      )}

      {statusMsg && !error && (
        <p className="text-xs text-center font-medium text-emerald-700">{statusMsg}</p>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 p-2.5 text-xs text-red-600 border border-red-200">
          {error}
        </div>
      )}
    </div>
  );
}

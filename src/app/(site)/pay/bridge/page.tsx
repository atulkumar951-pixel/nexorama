"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

interface BridgePaymentData {
  transactionId: string;
  razorpayOrderId: string;
  keyId: string;
  amountPaise: number;
  amount: number;
  currency: string;
  purpose: string;
  customer?: {
    name?: string;
    contact?: string;
    email?: string;
  };
  callbackUrl?: string;
}

function BridgePayContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [paymentData, setPaymentData] = useState<BridgePaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Invalid or missing payment token.");
      setLoading(false);
      return;
    }

    try {
      // Decode base64url or base64 token
      const decodedStr = atob(token.replace(/-/g, "+").replace(/_/g, "/"));
      const parsed = JSON.parse(decodedStr);
      setPaymentData(parsed);
      setLoading(false);
    } catch (e) {
      setError("Malformed payment token. Please initiate payment again.");
      setLoading(false);
    }
  }, [token]);

  async function loadRazorpayScript(): Promise<boolean> {
    if (window.Razorpay) return true;
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  async function launchPayment() {
    if (!paymentData) return;
    setProcessing(true);
    setError("");

    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error("Could not load Razorpay payment gateway.");

      const options = {
        key: paymentData.keyId,
        amount: paymentData.amountPaise,
        currency: paymentData.currency || "INR",
        name: "NexoraMart / ShareX",
        description: paymentData.purpose || `Transaction #${paymentData.transactionId}`,
        order_id: paymentData.razorpayOrderId || undefined,
        prefill: {
          name: paymentData.customer?.name || "",
          contact: paymentData.customer?.contact || "",
          email: paymentData.customer?.email || "",
        },
        theme: { color: "#4f46e5" },
        handler: async function (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) {
          try {
            const verifyRes = await fetch("/api/payment/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                transactionId: paymentData.transactionId,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id || paymentData.razorpayOrderId,
                razorpay_signature: response.razorpay_signature,
                amountPaise: paymentData.amountPaise,
                callbackUrl: paymentData.callbackUrl,
              }),
            });

            const verifyData = await verifyRes.json();
            if (verifyRes.ok) {
              setSuccess(true);
            } else {
              setError(verifyData.error || "Payment verification failed.");
            }
          } catch (err: any) {
            setError("Server verification network error. Your payment may still be processed automatically.");
          } finally {
            setProcessing(false);
          }
        },
        modal: {
          ondismiss: function () {
            setProcessing(false);
          },
        },
      };

      const rzp = new window.Razorpay!(options);
      rzp.open();
    } catch (err: any) {
      setError(err.message || "Failed to launch Razorpay.");
      setProcessing(false);
    }
  }

  // Auto-launch Razorpay when token is loaded
  useEffect(() => {
    if (paymentData && !success && !error) {
      launchPayment();
    }
  }, [paymentData]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          <p className="mt-4 text-sm font-medium text-slate-600">Initializing secure payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="card overflow-hidden p-8 shadow-xl">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
              <rect x="2" y="4" width="20" height="16" rx="2"></rect>
              <line x1="2" y1="10" x2="22" y2="10"></line>
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">NexoraMart Secure Gateway</h1>
            <p className="text-xs text-slate-500">Official Merchant Payment Channel</p>
          </div>
        </div>

        {success ? (
          <div className="py-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <h2 className="mt-4 text-xl font-extrabold text-slate-900">Payment Successful!</h2>
            <p className="mt-2 text-sm text-slate-600">
              Your transaction has been verified. Your order on ShareX / Gaming Rewards is now active.
            </p>
            <div className="mt-6 rounded-lg bg-slate-50 p-4 text-left text-xs text-slate-600 space-y-1">
              <div><span className="font-semibold">Txn ID:</span> {paymentData?.transactionId}</div>
              <div><span className="font-semibold">Amount:</span> ₹{paymentData?.amount?.toFixed(2)}</div>
              <div><span className="font-semibold">Status:</span> <span className="text-emerald-600 font-bold">COMPLETED</span></div>
            </div>
            <button
              onClick={() => window.close()}
              className="btn-primary mt-6 w-full !py-3"
            >
              Close & Return to App
            </button>
          </div>
        ) : (
          <div className="py-6">
            <div className="rounded-xl bg-slate-50 p-4 text-center">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount Payable</div>
              <div className="mt-1 text-3xl font-extrabold text-slate-900">
                ₹{paymentData?.amount ? Number(paymentData.amount).toFixed(2) : "0.00"}
              </div>
              <div className="mt-1 text-xs text-indigo-600 font-medium">
                {paymentData?.purpose || "Digital Order"}
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-600 font-medium">
                ⚠️ {error}
              </div>
            )}

            <div className="mt-6 space-y-3">
              <button
                onClick={launchPayment}
                disabled={processing}
                className="btn-primary w-full !py-3.5 !text-base !font-bold"
              >
                {processing ? "Connecting to Razorpay..." : "⚡ Complete Payment via Razorpay"}
              </button>
            </div>

            <p className="mt-6 text-center text-xs text-slate-400">
              🔒 256-bit encrypted checkout verified by Razorpay.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BridgePayPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
            <p className="mt-4 text-sm font-medium text-slate-600">Loading checkout...</p>
          </div>
        </div>
      }
    >
      <BridgePayContent />
    </Suspense>
  );
}

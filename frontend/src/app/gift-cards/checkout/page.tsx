"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { giftApi, inr, type GiftCartSummary, type GiftCheckoutSession, type GiftPaymentConfirmation } from "@/lib/gift";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void; on: (event: string, cb: (payload: unknown) => void) => void };
  }
}

const SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);
    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function GiftCheckoutPage() {
  const { user, loading: authLoading } = useAuth();
  const [cart, setCart] = useState<GiftCartSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState<GiftPaymentConfirmation | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await giftApi<GiftCartSummary>("/cart");
      setCart(res);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your gift cart.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    void load();
  }, [authLoading, user, load]);

  async function pay() {
    setPaying(true);
    setError("");
    try {
      const session = await giftApi<GiftCheckoutSession>("/checkout", { method: "POST" });
      const ready = await loadRazorpayScript();
      if (!ready || !window.Razorpay) {
        setError("Could not load the Razorpay checkout. Please disable ad-blockers and try again.");
        setPaying(false);
        return;
      }

      const checkout = new window.Razorpay({
        key: session.razorpayKeyId ?? process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "",
        amount: Math.round(session.amount * 100),
        currency: session.currency,
        name: "Nexora Gift Codes",
        description: `Gift code order ${session.orderNumber}`,
        order_id: session.razorpayOrderId,
        prefill: { email: user?.email ?? session.email, name: user?.name ?? "" },
        notes: { orderNumber: session.orderNumber },
        theme: { color: "#059669" },
        handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          try {
            const result = await giftApi<GiftPaymentConfirmation>("/checkout/verify", {
              method: "POST",
              body: {
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              },
            });
            setConfirmation(result);
          } catch (err) {
            setError(err instanceof Error ? err.message : "We could not verify your payment yet. If money was deducted, it will be reconciled automatically.");
          } finally {
            setPaying(false);
          }
        },
        modal: {
          ondismiss: () => {
            setPaying(false);
            setError("Payment was cancelled. Your reservation is still active until it expires.");
          },
        },
      });
      checkout.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout could not be started.");
      setPaying(false);
    }
  }

  if (authLoading || loading) {
    return <div className="container-page py-16 text-center text-sm text-gray-500">Preparing secure checkout…</div>;
  }

  if (!user) {
    return (
      <div className="container-page py-16">
        <div className="card mx-auto max-w-md p-8 text-center">
          <p className="text-3xl">🔐</p>
          <h1 className="mt-3 text-xl font-bold text-gray-900">Please sign in to purchase gift codes</h1>
          <Link href="/login?next=/gift-cards/checkout" className="btn-primary mt-5 inline-flex">Sign in</Link>
        </div>
      </div>
    );
  }

  if (confirmation) {
    const delivered = confirmation.deliveryStatus === "SENT";
    return (
      <div className="container-page py-14">
        <div className="card mx-auto max-w-xl p-8 text-center">
          <p className="text-4xl">🎉</p>
          <h1 className="mt-3 text-2xl font-extrabold text-gray-900">Payment Successful</h1>
          <p className="mt-1 text-sm text-gray-500">Thank you for your purchase!</p>

          <dl className="mt-6 space-y-3 rounded-xl bg-gray-50 p-4 text-left text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Order number</dt>
              <dd className="font-mono font-semibold text-gray-900">{confirmation.orderNumber}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Amount paid</dt>
              <dd className="font-semibold text-gray-900">{inr(confirmation.amountPaid)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Payment status</dt>
              <dd className="font-semibold text-emerald-600">{confirmation.paymentStatus}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Code delivery</dt>
              <dd className="font-semibold text-gray-900">{delivered ? "Sent to your email" : "Being processed"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Email</dt>
              <dd className="font-semibold text-gray-900">{confirmation.recipientEmail}</dd>
            </div>
          </dl>

          <p className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{confirmation.message}</p>
          <p className="mt-3 text-xs text-gray-500">
            For your security the gift code is never displayed on this website — it is emailed to your registered address by our
            team. Please check your inbox and spam/junk folder.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href={`/gift-cards/orders/${confirmation.orderNumber}`} className="btn-primary">View order</Link>
            <Link href="/gift-cards" className="btn-secondary">Back to gift codes</Link>
          </div>
        </div>
      </div>
    );
  }


  const items = cart?.items ?? [];

  return (
    <div className="container-page py-10">
      <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>
      <p className="mt-1 text-sm text-gray-500">
        Payment is verified by our servers. Your gift code is then emailed to your registered address.
      </p>

      {error && <div className="card mt-5 border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {items.length === 0 ? (
        <div className="card mt-6 p-10 text-center">
          <p className="text-3xl">🎁</p>
          <p className="mt-3 font-semibold text-gray-900">Your gift cart is empty</p>
          <Link href="/gift-cards" className="btn-primary mt-4 inline-flex">Browse gift codes</Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="card divide-y divide-gray-100">
            {items.map((line) => (
              <div key={line.id} className="flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="font-semibold text-gray-900">{line.product.name}</p>
                  <p className="text-xs text-gray-500">
                    {line.product.brandName} · Gift value {inr(line.product.denomination)} · Qty {line.quantity}
                  </p>
                </div>
                <p className="font-bold text-gray-900">{inr(line.lineTotal)}</p>
              </div>
            ))}
          </div>

          <aside className="card h-fit p-5">
            <h2 className="font-bold text-gray-900">Payment summary</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Items</dt>
                <dd className="font-semibold">{cart?.totalQuantity ?? 0}</dd>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-2">
                <dt className="font-semibold text-gray-900">Total payable</dt>
                <dd className="text-lg font-extrabold text-gray-900">{inr(cart?.subtotal ?? 0)}</dd>
              </div>
            </dl>

            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <strong>Important:</strong> Gift code purchases are non-refundable. Please verify the product, brand, denomination
              and quantity before completing payment.
            </div>

            <button
              onClick={() => void pay()}
              disabled={paying}
              className="btn-primary mt-5 w-full justify-center disabled:opacity-60"
            >
              {paying ? "Opening Razorpay…" : `Pay ${inr(cart?.subtotal ?? 0)} securely`}
            </button>
            <p className="mt-3 text-center text-xs text-gray-500">Secured by Razorpay · Your code is emailed, never displayed</p>
          </aside>
        </div>
      )}
    </div>
  );
}


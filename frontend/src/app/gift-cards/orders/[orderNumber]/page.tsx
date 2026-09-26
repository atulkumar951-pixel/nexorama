"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { giftApi, inr, type GiftOrderDetail } from "@/lib/gift";

export default function GiftOrderDetailPage({ params }: { params: { orderNumber: string } }) {
  const { user, loading: authLoading } = useAuth();
  const [order, setOrder] = useState<GiftOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await giftApi<GiftOrderDetail>(`/orders/${encodeURIComponent(params.orderNumber)}`);
      setOrder(res);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load this order.");
    } finally {
      setLoading(false);
    }
  }, [params.orderNumber]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    void load();
  }, [authLoading, user, load]);

  if (authLoading || loading) {
    return <div className="container-page py-16 text-center text-sm text-gray-500">Loading order…</div>;
  }

  if (!user || error || !order) {
    return (
      <div className="container-page py-16">
        <div className="card mx-auto max-w-lg p-8 text-center">
          <p className="text-3xl">🎁</p>
          <h1 className="mt-3 text-xl font-bold text-gray-900">
            {user ? "Order unavailable" : "Please sign in to view this order"}
          </h1>
          <p className="mt-2 text-sm text-gray-600">{error || "Sign in with the account used for this purchase."}</p>
          <div className="mt-5 flex justify-center gap-3">
            {!user && <Link href={`/login?next=/gift-cards/orders/${params.orderNumber}`} className="btn-primary">Sign in</Link>}
            <Link href="/gift-cards" className="btn-secondary">Back to gift codes</Link>
          </div>
        </div>
      </div>
    );
  }

  const sent = order.deliveryStatus === "SENT";

  return (
    <div className="container-page py-10">
      <nav className="text-xs text-gray-500">
        <Link href="/gift-cards" className="hover:underline">Gift Codes</Link> {" / "}
        <Link href="/gift-cards/vault" className="hover:underline">My Gift Codes</Link> {" / "}
        <span className="text-gray-700">{order.orderNumber}</span>
      </nav>

      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order {order.orderNumber}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Placed {new Date(order.createdAt).toLocaleString("en-IN")}
            {order.paidAt ? ` · Paid ${new Date(order.paidAt).toLocaleString("en-IN")}` : ""}
          </p>
        </div>
        <span className={`badge ${sent ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
          {sent ? "Code sent to email" : "Code being processed"}
        </span>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="card divide-y divide-gray-100">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="font-semibold text-gray-900">{item.title}</p>
                <p className="text-xs text-gray-500">
                  {item.brandName} · Gift value {inr(item.denomination)} · Qty {item.quantity} · {inr(item.unitPrice)} each
                </p>
                {item.deliveryStatus && (
                  <p className="mt-1 text-xs font-semibold text-gray-600">Delivery: {item.deliveryStatus}</p>
                )}
              </div>
              <p className="font-bold text-gray-900">{inr(item.totalPrice)}</p>
            </div>
          ))}
        </div>

        <aside className="card h-fit p-5 text-sm">
          <h2 className="font-bold text-gray-900">Payment &amp; delivery</h2>
          <dl className="mt-4 space-y-2">
            <div className="flex justify-between">
              <dt className="text-gray-500">Payment status</dt>
              <dd className="font-semibold text-gray-900">{order.paymentStatus}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Order status</dt>
              <dd className="font-semibold text-gray-900">{order.status}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Total paid</dt>
              <dd className="font-semibold text-gray-900">{inr(order.amount)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Delivery email</dt>
              <dd className="font-semibold text-gray-900">{order.recipientEmailMasked}</dd>
            </div>
            {order.expectedBy && !sent && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Expected by</dt>
                <dd className="font-semibold text-gray-900">{new Date(order.expectedBy).toLocaleTimeString("en-IN")}</dd>
              </div>
            )}
          </dl>

          <p className={`mt-4 rounded-lg p-3 text-xs ${sent ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
            {order.deliveryMessage}
          </p>

          <p className="mt-3 rounded-lg border border-gray-200 p-3 text-xs text-gray-500">
            Gift code purchases are non-refundable. For your security the code is never shown on this website — it is emailed to your
            registered address.
          </p>
        </aside>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { giftApi, inr, type GiftVaultItem } from "@/lib/gift";

interface VaultResponse {
  giftCodes: GiftVaultItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

interface StatsResponse {
  orders: number;
  codesOwned: number;
  pendingDelivery: number;
}

export default function GiftVaultPage() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<VaultResponse | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [codes, summary] = await Promise.all([
        giftApi<VaultResponse>("/my-codes?limit=24"),
        giftApi<StatsResponse>("/stats"),
      ]);
      setData(codes);
      setStats(summary);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your gift codes.");
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

  if (authLoading || loading) {
    return <div className="container-page py-16 text-center text-sm text-gray-500">Loading your gift codes…</div>;
  }

  if (!user) {
    return (
      <div className="container-page py-16">
        <div className="card mx-auto max-w-md p-8 text-center">
          <p className="text-3xl">🔐</p>
          <h1 className="mt-3 text-xl font-bold text-gray-900">Sign in to view your gift codes</h1>
          <Link href="/login?next=/gift-cards/vault" className="btn-primary mt-5 inline-flex">Sign in</Link>
        </div>
      </div>
    );
  }

  const items = data?.giftCodes ?? [];

  return (
    <div className="container-page py-10">
      <h1 className="text-2xl font-bold text-gray-900">My Gift Codes</h1>
      <p className="mt-1 text-sm text-gray-500">
        Purchase and delivery status for every gift code you have bought. Codes are emailed to you and are never displayed here.
      </p>


      <div className="mt-5 grid grid-cols-3 gap-3 sm:max-w-lg">
        <div className="card p-4 text-center">
          <p className="text-xl font-extrabold text-gray-900">{stats?.orders ?? 0}</p>
          <p className="text-xs text-gray-500">Gift orders</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xl font-extrabold text-gray-900">{stats?.codesOwned ?? 0}</p>
          <p className="text-xs text-gray-500">Codes owned</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xl font-extrabold text-emerald-600">{stats?.pendingDelivery ?? 0}</p>
          <p className="text-xs text-gray-500">Processing</p>
        </div>
      </div>

      {error && <div className="card mt-5 border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {items.length === 0 ? (
        <div className="card mt-6 p-10 text-center">
          <p className="text-3xl">🎁</p>
          <p className="mt-3 font-semibold text-gray-900">You have not purchased any gift codes yet</p>
          <Link href="/gift-cards" className="btn-primary mt-4 inline-flex">Browse gift cards</Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {items.map((item) => {
            const sent = item.deliveryStatus === "SENT";
            return (
              <div key={item.id} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-gray-900">{item.product}</p>
                    <p className="text-xs text-gray-500">Gift value {inr(item.denomination)} · Qty {item.quantity}</p>
                  </div>
                  <span className={`badge ${sent ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                    {sent ? "Sent to email" : "Processing"}
                  </span>
                </div>

                <dl className="mt-4 space-y-1.5 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <dt>Order</dt>
                    <dd>
                      <Link
                        href={`/gift-cards/orders/${item.orderNumber}`}
                        className="font-mono font-semibold text-emerald-700 hover:underline"
                      >
                        {item.orderNumber}
                      </Link>
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Purchased</dt>
                    <dd>{new Date(item.purchasedAt).toLocaleString("en-IN")}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Payment</dt>
                    <dd className="font-semibold text-gray-900">{item.paymentStatus}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Amount</dt>
                    <dd className="font-semibold text-gray-900">{inr(item.amount)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Email</dt>
                    <dd>{item.recipientEmailMasked}</dd>
                  </div>
                  {item.sentAt && (
                    <div className="flex justify-between">
                      <dt>Sent at</dt>
                      <dd>{new Date(item.sentAt).toLocaleString("en-IN")}</dd>
                    </div>
                  )}
                </dl>

                <p className="mt-4 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">{item.deliveryMessage}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

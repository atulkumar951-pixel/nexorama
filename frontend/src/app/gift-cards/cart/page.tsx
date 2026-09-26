"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { giftApi, inr, type GiftCartSummary } from "@/lib/gift";

export default function GiftCartPage() {
  const { user, loading: authLoading } = useAuth();
  const [cart, setCart] = useState<GiftCartSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyProduct, setBusyProduct] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [clockOffset, setClockOffset] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await giftApi<GiftCartSummary>("/cart");
      setCart(res);
      setClockOffset(new Date(res.serverTime).getTime() - Date.now());
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

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const secondsLeft = useMemo(() => {
    if (!cart?.reservationExpiresAt) return null;
    const expiry = new Date(cart.reservationExpiresAt).getTime() - clockOffset;
    return Math.max(0, Math.floor((expiry - now) / 1000));
  }, [cart, clockOffset, now]);

  const expired = secondsLeft === 0 && Boolean(cart?.reservationExpiresAt) && (cart?.items.length ?? 0) > 0;

  async function setQuantity(giftProductId: string, quantity: number) {
    setBusyProduct(giftProductId);
    try {
      const res = await giftApi<GiftCartSummary>(`/cart/${giftProductId}`, { method: "PATCH", body: { quantity } });
      setCart(res);
      setClockOffset(new Date(res.serverTime).getTime() - Date.now());
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update quantity.");
    } finally {
      setBusyProduct(null);
    }
  }

  async function remove(giftProductId: string) {
    setBusyProduct(giftProductId);
    try {
      const res = await giftApi<GiftCartSummary>(`/cart/${giftProductId}`, { method: "DELETE" });
      setCart(res);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove the item.");
    } finally {
      setBusyProduct(null);
    }
  }

  if (authLoading || loading) {
    return <div className="container-page py-16 text-center text-sm text-gray-500">Loading your gift cart…</div>;
  }

  if (!user) {
    return (
      <div className="container-page py-16">
        <div className="card mx-auto max-w-md p-8 text-center">
          <p className="text-3xl">🔐</p>
          <h1 className="mt-3 text-xl font-bold text-gray-900">Please sign in to purchase gift codes</h1>
          <p className="mt-2 text-sm text-gray-600">Gift codes require an account so we can email your code securely.</p>
          <Link href="/login?next=/gift-cards/cart" className="btn-primary mt-5 inline-flex">Sign in</Link>
        </div>
      </div>
    );
  }

  const items = cart?.items ?? [];
  const totalQuantity = cart?.totalQuantity ?? 0;
  const subtotal = cart?.subtotal ?? 0;

  return (
    <div className="container-page py-10">
      <h1 className="text-2xl font-bold text-gray-900">Gift cart</h1>
      <p className="mt-1 text-sm text-gray-500">
        Inventory is held for you temporarily while you check out. Gift code purchases are non-refundable.
      </p>

      {cart?.reservationExpiresAt && (
        <div className={`card mt-5 flex flex-wrap items-center justify-between gap-3 p-4 ${expired ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"}`}>
          {expired ? (
            <>
              <p className="text-sm font-semibold text-red-700">
                Your cart reservation has expired. Reserved inventory has been released.
              </p>
              <button onClick={() => void load()} className="btn-secondary">Refresh cart</button>
            </>
          ) : (
            <p className="text-sm font-semibold text-emerald-800">
              Your reservation expires in <span className="font-mono text-base">{formatSeconds(secondsLeft ?? 0)}</span>
            </p>
          )}
        </div>
      )}

      {error && <div className="card mt-5 border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {items.length === 0 ? (
        <div className="card mt-6 p-10 text-center">
          <p className="text-3xl">🎁</p>
          <p className="mt-3 font-semibold text-gray-900">Your gift cart is empty</p>
          <Link href="/gift-cards" className="btn-primary mt-4 inline-flex">Browse gift cards</Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-3">
            {items.map((line) => (
              <div key={line.id} className="card flex flex-wrap items-center gap-4 p-4">
                <div className="flex h-16 w-20 items-center justify-center overflow-hidden rounded-lg bg-emerald-50 text-2xl">
                  {line.product.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={line.product.image} alt={line.product.name} className="h-full w-full object-cover" />
                  ) : (
                    "🎁"
                  )}
                </div>
                <div className="min-w-[180px] flex-1">
                  <Link href={`/gift-cards/${line.product.slug}`} className="font-bold text-gray-900 hover:underline">
                    {line.product.name}
                  </Link>
                  <p className="text-xs text-gray-500">
                    {line.product.brandName} · Gift value {inr(line.product.denomination)}
                  </p>
                  <p className={`mt-1 text-xs font-semibold ${line.stock.outOfStock ? "text-red-600" : "text-emerald-600"}`}>
                    {line.stock.outOfStock ? "Out of stock" : `${line.stock.sellable} available`}
                  </p>
                </div>
                <select
                  value={line.quantity}
                  disabled={busyProduct === line.giftProductId}
                  onChange={(e) => void setQuantity(line.giftProductId, Number(e.target.value))}
                  className="input !w-20"
                  aria-label={`Quantity for ${line.product.name}`}
                >
                  {quantityOptions(line.quantity, line.stock.sellable).map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <p className="w-24 text-right font-bold text-gray-900">{inr(line.lineTotal)}</p>
                <button
                  onClick={() => void remove(line.giftProductId)}
                  disabled={busyProduct === line.giftProductId}
                  className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <aside className="card h-fit p-5">
            <h2 className="font-bold text-gray-900">Order summary</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Items</dt>
                <dd className="font-semibold">{totalQuantity}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Subtotal</dt>
                <dd className="font-semibold">{inr(subtotal)}</dd>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-2">
                <dt className="font-semibold text-gray-900">Total payable</dt>
                <dd className="text-lg font-extrabold text-gray-900">{inr(subtotal)}</dd>
              </div>
            </dl>
            <Link
              href="/gift-cards/checkout"
              className={`btn-primary mt-5 w-full justify-center ${expired ? "pointer-events-none opacity-50" : ""}`}
            >
              Proceed to checkout
            </Link>
            <p className="mt-3 text-xs text-gray-500">
              Non-refundable. Your code is emailed to your registered address after payment verification.
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}

function formatSeconds(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function quantityOptions(current: number, sellable: number): number[] {
  const max = Math.max(1, Math.min(10, Math.max(current, sellable)));
  return Array.from({ length: max }, (_, i) => i + 1);
}


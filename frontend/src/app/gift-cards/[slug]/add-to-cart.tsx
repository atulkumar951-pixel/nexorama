"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { giftApi, inr } from "@/lib/gift";

/** Quantity + Add to cart / Buy now for a gift product (authenticated). */
export function AddToCart({ productId, maxQuantity, outOfStock }: { productId: string; maxQuantity: number; outOfStock: boolean }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [state, setState] = useState<"idle" | "loading" | "error" | "done">("idle");
  const [message, setMessage] = useState("");

  async function add(thenCheckout: boolean) {
    if (ensureSignedIn(authLoading, user, setMessage, setState)) return;

    setState("loading");
    setMessage("");
    try {
      const res = await giftApi<{ reservationExpiresAt: string | null }>("/cart", {
        method: "POST",
        body: { giftProductId: productId, quantity },
      });
      setState("done");
      setMessage(
        thenCheckout
          ? "Reserved — taking you to checkout…"
          : res.reservationExpiresAt
            ? `Added. Your reservation is held until ${new Date(res.reservationExpiresAt).toLocaleTimeString()}.`
            : "Added to your gift cart.",
      );
      router.refresh();
      if (thenCheckout) {
        setTimeout(() => router.push("/gift-cards/checkout"), 600);
      } else {
        setTimeout(() => router.push("/gift-cards/cart"), 800);
      }
    } catch (err) {
      setState("error");
      setMessage(err instanceof Error ? err.message : "Could not add this gift code. Please try again.");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <label className="label !mb-0" htmlFor="gift-qty">Quantity</label>
        <select
          id="gift-qty"
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          disabled={outOfStock}
          className="input !w-24"
        >
          {Array.from({ length: Math.max(1, Math.min(maxQuantity, 10)) }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => add(false)}
          disabled={outOfStock || state === "loading"}
          className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {outOfStock ? "Out of stock" : state === "loading" ? "Adding…" : "Add to cart"}
        </button>
        <button
          type="button"
          onClick={() => add(true)}
          disabled={outOfStock || state === "loading"}
          className="rounded-lg border border-emerald-600 px-5 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
        >
          Buy now
        </button>
      </div>

      {message && (
        <p className={`text-sm ${state === "error" ? "text-red-600" : "text-emerald-700"}`}>{message}</p>
      )}
      <p className="text-xs text-gray-500">
        Non-refundable. Your code will be emailed to your registered address after payment verification.
      </p>
    </div>
  );
}

function ensureSignedIn(
  authLoading: boolean,
  user: unknown,
  setMessage: (v: string) => void,
  setState: (v: "idle" | "error") => void,
): boolean {
  if (authLoading) {
    setMessage("Checking your session…");
    setState("idle");
    return true;
  }
  if (!user) {
    setMessage("Please sign in to purchase gift codes.");
    setState("error");
    setTimeout(() => {
      window.location.href = "/login?next=/gift-cards";
    }, 1200);
    return true;
  }
  return false;
}

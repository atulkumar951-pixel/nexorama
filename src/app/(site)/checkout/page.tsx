import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { cartItems, products } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { effectivePrice } from "@/lib/helpers";
import { formatINR } from "@/lib/format";
import CheckoutForm from "./checkout-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/checkout");

  const rows = await db
    .select({ product: products })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .where(eq(cartItems.userId, user.id));

  const items = rows.map((r) => r.product).filter((p) => p.status === "PUBLISHED");
  if (items.length === 0) redirect("/cart");

  const subtotal = items.reduce((s, p) => s + p.price, 0);
  const payable = items.reduce((s, p) => s + effectivePrice(p), 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold">Checkout</h1>
      <p className="mt-1 text-sm text-slate-500">Signed in as <span className="font-semibold">{user.email}</span></p>

      <div className="mt-8 grid gap-6 md:grid-cols-[1fr_340px]">
        <div className="card divide-y divide-slate-100">
          {items.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 p-4">
              <div>
                <Link href={`/products/${p.slug}`} className="font-semibold hover:text-indigo-600">{p.title}</Link>
                <p className="text-xs text-slate-500">{p.productType}</p>
              </div>
              <p className="font-bold">{p.isFree ? "Free" : formatINR(effectivePrice(p))}</p>
            </div>
          ))}
          <div className="space-y-1 p-4 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{formatINR(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Sale discount</span><span className="text-emerald-600">−{formatINR(subtotal - payable)}</span></div>
            <div className="flex justify-between pt-1 text-base font-bold"><span>Payable (before coupon)</span><span>{formatINR(payable)}</span></div>
            <p className="pt-1 text-xs text-slate-400">Final amount is always recalculated securely on the server.</p>
          </div>
        </div>
        <CheckoutForm />
      </div>
    </div>
  );
}

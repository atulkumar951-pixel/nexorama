import { db } from "@/db";
import { orders, orderItems, giftCodeDeliveries, giftProducts } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getMarketplaceMode } from "@/lib/marketplace-mode";
import { formatDate, formatINR, formatOrderNumber } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Gift Codes | Nexora" };

export default async function MyGiftCodesPage() {
  const mode = await getMarketplaceMode();
  if (mode !== "GIFT_CODES") redirect("/library");

  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/my-gift-codes");

  // Get all gift code orders for this user, with delivery info
  const rows = await db
    .select({
      orderId: orders.id,
      orderNumber: orders.orderNumber,
      orderStatus: orders.status,
      total: orders.total,
      createdAt: orders.createdAt,
      itemTitle: orderItems.title,
      denomination: orderItems.denomination,
      quantity: orderItems.quantity,
      deliveryId: giftCodeDeliveries.id,
      deliveryStatus: giftCodeDeliveries.status,
      recipientEmail: giftCodeDeliveries.recipientEmail,
      sentAt: giftCodeDeliveries.sentAt,
      productName: giftProducts.name,
      brandName: giftProducts.brandName,
      productSlug: giftProducts.slug,
    })
    .from(orders)
    .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
    .leftJoin(giftCodeDeliveries, eq(giftCodeDeliveries.orderId, orders.id))
    .leftJoin(giftProducts, eq(orderItems.giftProductId, giftProducts.id))
    .where(and(eq(orders.userId, user.id), eq(orders.orderType, "GIFT_CODE")))
    .orderBy(desc(orders.createdAt));

  const statusColor: Record<string, string> = {
    PENDING: "bg-amber-50 text-amber-800 border-amber-200",
    ASSIGNED: "bg-emerald-50 text-emerald-800 border-emerald-200",
    PROCESSING: "bg-emerald-50 text-emerald-800 border-emerald-200",
    SENT: "bg-emerald-50 text-emerald-800 border-emerald-200",
    FAILED: "bg-red-50 text-red-800 border-red-200",
    CANCELLED: "bg-slate-100 text-slate-600 border-slate-200",
    REPLACED: "bg-orange-50 text-orange-800 border-orange-200",
    SOLD_OUT: "bg-rose-50 text-rose-800 border-rose-200",
    OUT_OF_STOCK: "bg-rose-50 text-rose-800 border-rose-200",
  };

  const deliveryLabel: Record<string, string> = {
    PENDING: "Pending",
    ASSIGNED: "Delivered",
    PROCESSING: "Delivered",
    SENT: "Delivered",
    FAILED: "Failed",
    CANCELLED: "Cancelled",
    REPLACED: "Replaced",
    SOLD_OUT: "Sold Out",
    OUT_OF_STOCK: "Sold Out",
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-10 selection:bg-emerald-500 selection:text-white">
      <div className="mx-auto max-w-4xl px-4">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900">My Gift Codes</h1>
            <p className="mt-1 text-xs text-slate-500">
              Access all your purchased gift vouchers, redemption details, and invoices.
            </p>
          </div>
          <Link
            href="/gift-codes"
            className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-200 hover:from-emerald-500 hover:to-teal-500 transition"
          >
            🎁 Shop More Vouchers
          </Link>
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white py-20 text-center shadow-xs">
            <div className="text-6xl mb-4">🎁</div>
            <h3 className="text-lg font-bold text-slate-900">No gift codes purchased yet</h3>
            <p className="mt-1.5 text-xs text-slate-500 max-w-xs leading-relaxed">
              Explore 50+ official brands like Steam, Amazon, Google Play, Netflix, and get codes delivered instantly upon payment.
            </p>
            <Link
              href="/gift-codes"
              className="mt-6 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-md shadow-emerald-200 transition"
            >
              Browse Gift Codes
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map((row) => {
              const isPaid = row.orderStatus === "PAID" || row.orderStatus === "COMPLETED";
              const cleanTitle = row.itemTitle.replace(/^([A-Za-z0-9]+)\s+\1\b/i, "$1");

              return (
                <div
                  key={`${row.orderId}-${row.deliveryId ?? 0}`}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300"
                >
                  {/* Order header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold text-slate-700">
                        {formatOrderNumber(row.orderNumber)}
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                          isPaid
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : row.orderStatus === "PENDING"
                            ? "border-amber-200 bg-amber-50 text-amber-800"
                            : "border-slate-200 bg-slate-100 text-slate-600"
                        }`}
                      >
                        {row.orderStatus}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>{formatDate(row.createdAt.toISOString())}</span>
                      <span className="font-black text-slate-900">{formatINR(row.total)}</span>
                    </div>
                  </div>

                  {/* Product & details info */}
                  <div className="p-5">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-bold text-slate-900 text-base sm:text-lg">
                          {row.brandName && !cleanTitle.toLowerCase().startsWith(row.brandName.toLowerCase()) ? (
                            <><span className="text-emerald-700">{row.brandName} · </span>{cleanTitle}</>
                          ) : (
                            cleanTitle
                          )}
                        </p>
                        {row.denomination && (
                          <p className="text-xs text-slate-500 mt-1">
                            Voucher Value: <strong className="text-slate-800">{formatINR(row.denomination)}</strong>
                            {row.quantity > 1 && <> × {row.quantity}</>}
                          </p>
                        )}
                        {row.recipientEmail && (
                          <p className="mt-1 text-xs text-slate-500">
                            Recipient: <strong className="text-slate-700">{row.recipientEmail}</strong>
                          </p>
                        )}
                      </div>

                      {/* Right Action: Click to view code on the order page */}
                      <div className="flex items-center gap-3">
                        {row.deliveryStatus && (
                          <span
                            className={`rounded-xl border px-3 py-1.5 text-xs font-bold ${
                              statusColor[row.deliveryStatus] ?? "bg-slate-100 text-slate-700 border-slate-200"
                            }`}
                          >
                            {deliveryLabel[row.deliveryStatus] ?? row.deliveryStatus}
                          </span>
                        )}
                        <Link
                          href={`/orders/${formatOrderNumber(row.orderNumber)}`}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-emerald-200 hover:from-emerald-500 hover:to-teal-500 transition"
                        >
                          <span>View Code</span>
                          <span>→</span>
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Footer actions */}
                  <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-5 py-2.5 text-xs">
                    <Link
                      href={`/orders/${formatOrderNumber(row.orderNumber)}`}
                      className="font-semibold text-emerald-700 hover:text-emerald-800 transition"
                    >
                      View Invoice Details →
                    </Link>
                    {row.productSlug && (
                      <Link
                        href={`/gift-codes/${row.productSlug}`}
                        className="font-semibold text-slate-600 hover:text-slate-900 transition"
                      >
                        Buy Again
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

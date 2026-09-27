import { db } from "@/db";
import { orders, orderItems, giftCodeDeliveries, giftCodes, giftProducts } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getMarketplaceMode } from "@/lib/marketplace-mode";
import { formatDate } from "@/lib/format";
import { formatINR } from "@/lib/format";

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
      adminNote: giftCodeDeliveries.adminNote,
      maskedCode: giftCodes.maskedCode,
      codeStatus: giftCodes.status,
      productName: giftProducts.name,
      brandName: giftProducts.brandName,
      productSlug: giftProducts.slug,
    })
    .from(orders)
    .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
    .leftJoin(giftCodeDeliveries, eq(giftCodeDeliveries.orderId, orders.id))
    .leftJoin(giftCodes, eq(giftCodeDeliveries.giftCodeId, giftCodes.id))
    .leftJoin(giftProducts, eq(orderItems.giftProductId, giftProducts.id))
    .where(and(eq(orders.userId, user.id), eq(orders.orderType, "GIFT_CODE")))
    .orderBy(desc(orders.createdAt));

  const statusColor: Record<string, string> = {
    PENDING: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    ASSIGNED: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    PROCESSING: "bg-violet-500/10 text-violet-400 border-violet-500/30",
    SENT: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    FAILED: "bg-red-500/10 text-red-400 border-red-500/30",
    CANCELLED: "bg-slate-800 text-slate-400 border-slate-700",
    REPLACED: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  };

  const deliveryLabel: Record<string, string> = {
    PENDING: "⏳ Processing",
    ASSIGNED: "🔄 Code Assigned",
    PROCESSING: "📤 Dispatching",
    SENT: "✅ Delivered to Email",
    FAILED: "❌ Delivery Failed",
    CANCELLED: "🚫 Cancelled",
    REPLACED: "🔁 Replaced",
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 selection:bg-emerald-500 selection:text-white">
      <div className="mx-auto max-w-4xl px-4">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-white">My Gift Codes</h1>
            <p className="mt-1 text-xs text-slate-400">
              Track your purchased gift vouchers, delivery timestamps, and order history.
            </p>
          </div>
          <Link
            href="/gift-codes"
            className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-400 transition"
          >
            🎁 Shop More Vouchers
          </Link>
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-800 bg-slate-900/40 py-20 text-center">
            <div className="text-6xl mb-4">🎁</div>
            <h3 className="text-lg font-bold text-white">No gift codes purchased yet</h3>
            <p className="mt-1.5 text-xs text-slate-400 max-w-xs leading-relaxed">
              Explore 50+ official brands like Steam, Amazon, Google Play, Netflix, and get codes delivered in under 5 minutes.
            </p>
            <Link
              href="/gift-codes"
              className="mt-6 rounded-xl bg-emerald-500 px-6 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 transition"
            >
              Browse Gift Codes
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {rows.map((row) => (
              <div
                key={`${row.orderId}-${row.deliveryId}`}
                className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl transition"
              >
                {/* Order header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/60 px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-slate-300">{row.orderNumber}</span>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                        row.orderStatus === "PAID" || row.orderStatus === "COMPLETED"
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                          : row.orderStatus === "PENDING"
                          ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                          : "border-slate-800 bg-slate-800 text-slate-400"
                      }`}
                    >
                      {row.orderStatus}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span>{formatDate(row.createdAt.toISOString())}</span>
                    <span className="font-black text-white">{formatINR(row.total)}</span>
                  </div>
                </div>

                {/* Product & delivery info */}
                <div className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-bold text-white text-lg">
                        {row.brandName && <span className="text-emerald-400">{row.brandName} · </span>}
                        {row.itemTitle}
                      </p>
                      {row.denomination && (
                        <p className="text-xs text-slate-400 mt-1">
                          Voucher Value: <strong className="text-slate-200">{formatINR(row.denomination)}</strong>
                          {row.quantity > 1 && <> × {row.quantity}</>}
                        </p>
                      )}
                      {row.recipientEmail && (
                        <p className="mt-1 text-xs text-slate-400">
                          Recipient Email: <strong className="text-slate-200">{row.recipientEmail}</strong>
                        </p>
                      )}
                    </div>

                    {/* Delivery status badge */}
                    {row.deliveryStatus && (
                      <div
                        className={`rounded-xl border px-3.5 py-1.5 text-xs font-bold ${
                          statusColor[row.deliveryStatus] ?? "bg-slate-800 text-slate-400 border-slate-700"
                        }`}
                      >
                        {deliveryLabel[row.deliveryStatus] ?? row.deliveryStatus}
                      </div>
                    )}
                  </div>

                  {/* Sent confirmation banner */}
                  {row.deliveryStatus === "SENT" && row.sentAt && (
                    <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-4">
                      <p className="text-xs font-bold text-emerald-300">
                        ✅ Digital code dispatched on {formatDate(row.sentAt.toISOString())}
                      </p>
                      <p className="mt-1 text-[11px] text-emerald-400/90 leading-relaxed">
                        Please check your inbox (and spam/promotions folder) at{" "}
                        <strong className="text-white">{row.recipientEmail}</strong> for the redemption voucher.
                      </p>
                      {row.maskedCode && row.maskedCode !== "UNASSIGNED" && (
                        <p className="mt-2 text-xs text-slate-300">
                          Credential Preview:{" "}
                          <span className="font-mono font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-emerald-400">
                            {row.maskedCode}
                          </span>
                        </p>
                      )}
                    </div>
                  )}

                  {/* Processing banner */}
                  {(row.deliveryStatus === "PENDING" || row.deliveryStatus === "ASSIGNED") &&
                    (row.orderStatus === "PAID" || row.orderStatus === "COMPLETED") && (
                      <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-950/40 p-4">
                        <p className="text-xs font-bold text-amber-300">
                          ⏳ Your code is being processed in our queue
                        </p>
                        <p className="mt-1 text-[11px] text-amber-400/90">
                          Codes are typically delivered within 2 to 5 minutes to{" "}
                          <strong className="text-white">{row.recipientEmail}</strong>.
                        </p>
                      </div>
                    )}

                  {/* Failed banner */}
                  {row.deliveryStatus === "FAILED" && (
                    <div className="mt-4 rounded-xl border border-red-500/30 bg-red-950/40 p-4">
                      <p className="text-xs font-bold text-red-300">❌ Dispatch Alert</p>
                      <p className="mt-1 text-[11px] text-red-400/90">
                        Please contact our 24/7 ops desk with order reference{" "}
                        <strong className="text-white">{row.orderNumber}</strong> for immediate resolution.
                      </p>
                    </div>
                  )}

                  {/* Ops Admin Note */}
                  {row.adminNote && row.deliveryStatus === "SENT" && (
                    <p className="mt-2 text-[11px] text-slate-400">
                      <span className="font-semibold text-slate-300">Note:</span> {row.adminNote}
                    </p>
                  )}
                </div>

                {/* Footer actions */}
                <div className="flex items-center gap-4 border-t border-slate-800 bg-slate-950/40 px-5 py-3 text-xs">
                  <Link href={`/orders/${row.orderId}`} className="font-bold text-emerald-400 hover:text-emerald-300 transition">
                    View Full Invoice →
                  </Link>
                  {row.productSlug && (
                    <Link
                      href={`/gift-codes/${row.productSlug}`}
                      className="font-semibold text-slate-400 hover:text-white transition"
                    >
                      Buy Again
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

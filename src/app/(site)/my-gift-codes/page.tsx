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
    PENDING: "bg-amber-100 text-amber-700 border-amber-200",
    ASSIGNED: "bg-blue-100 text-blue-700 border-blue-200",
    PROCESSING: "bg-violet-100 text-violet-700 border-violet-200",
    SENT: "bg-emerald-100 text-emerald-700 border-emerald-200",
    FAILED: "bg-red-100 text-red-700 border-red-200",
    CANCELLED: "bg-slate-100 text-slate-500 border-slate-200",
    REPLACED: "bg-orange-100 text-orange-700 border-orange-200",
  };

  const deliveryLabel: Record<string, string> = {
    PENDING: "⏳ Processing",
    ASSIGNED: "🔄 Code Assigned",
    PROCESSING: "📤 Sending",
    SENT: "✅ Code Sent",
    FAILED: "❌ Delivery Failed",
    CANCELLED: "🚫 Cancelled",
    REPLACED: "🔁 Replaced",
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">My Gift Codes</h1>
          <p className="mt-1 text-sm text-slate-500">
            Track your purchased gift cards and vouchers.
          </p>
        </div>
        <Link
          href="/gift-codes"
          className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 transition"
        >
          🎁 Buy More
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-emerald-300 bg-emerald-50/50 py-20 text-center">
          <div className="text-6xl mb-5">🎁</div>
          <p className="text-xl font-bold text-slate-800">No gift codes yet</p>
          <p className="mt-2 text-sm text-slate-500 max-w-xs">
            Browse our collection of gift cards, gaming vouchers and OTT subscriptions.
          </p>
          <Link
            href="/gift-codes"
            className="mt-6 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-700 transition"
          >
            Shop Gift Cards
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {rows.map((row) => (
            <div
              key={`${row.orderId}-${row.deliveryId}`}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              {/* Order header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold text-slate-600">{row.orderNumber}</span>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                      row.orderStatus === "PAID" || row.orderStatus === "COMPLETED"
                        ? "border-emerald-200 bg-emerald-100 text-emerald-700"
                        : row.orderStatus === "PENDING"
                        ? "border-amber-200 bg-amber-100 text-amber-700"
                        : "border-slate-200 bg-slate-100 text-slate-500"
                    }`}
                  >
                    {row.orderStatus}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>{formatDate(row.createdAt.toISOString())}</span>
                  <span className="font-bold text-slate-700">{formatINR(row.total)}</span>
                </div>
              </div>

              {/* Product & delivery info */}
              <div className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-bold text-slate-900 text-lg">
                      {row.brandName && <span className="text-emerald-600">{row.brandName} · </span>}
                      {row.itemTitle}
                    </p>
                    {row.denomination && (
                      <p className="text-sm text-slate-500 mt-0.5">
                        Card Value: <strong className="text-slate-700">{formatINR(row.denomination)}</strong>
                        {row.quantity > 1 && <> × {row.quantity}</>}
                      </p>
                    )}
                    {row.recipientEmail && (
                      <p className="mt-1 text-sm text-slate-500">
                        Delivery to: <strong className="text-slate-700">{row.recipientEmail}</strong>
                      </p>
                    )}
                  </div>

                  {/* Delivery status badge */}
                  {row.deliveryStatus && (
                    <div
                      className={`rounded-xl border px-4 py-2 text-sm font-semibold ${
                        statusColor[row.deliveryStatus] ?? "bg-slate-100 text-slate-600 border-slate-200"
                      }`}
                    >
                      {deliveryLabel[row.deliveryStatus] ?? row.deliveryStatus}
                    </div>
                  )}
                </div>

                {/* Sent confirmation */}
                {row.deliveryStatus === "SENT" && row.sentAt && (
                  <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                    <p className="text-sm font-semibold text-emerald-800">
                      ✅ Code delivered on {formatDate(row.sentAt.toISOString())}
                    </p>
                    <p className="mt-1 text-xs text-emerald-600">
                      Check your email inbox at <strong>{row.recipientEmail}</strong> for your gift code.
                    </p>
                    {row.maskedCode && row.maskedCode !== "UNASSIGNED" && (
                      <p className="mt-1 text-xs text-emerald-700">
                        Code preview: <span className="font-mono font-bold">{row.maskedCode}</span>
                      </p>
                    )}
                  </div>
                )}

                {/* Pending message */}
                {(row.deliveryStatus === "PENDING" || row.deliveryStatus === "ASSIGNED") &&
                  (row.orderStatus === "PAID" || row.orderStatus === "COMPLETED") && (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <p className="text-sm font-semibold text-amber-800">
                      ⏳ Your code is being processed
                    </p>
                    <p className="mt-0.5 text-xs text-amber-600">
                      Codes are typically delivered within 5 minutes. Check your email at{" "}
                      <strong>{row.recipientEmail}</strong>.
                    </p>
                  </div>
                )}

                {/* Failed */}
                {row.deliveryStatus === "FAILED" && (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                    <p className="text-sm font-semibold text-red-700">❌ Delivery failed</p>
                    <p className="mt-0.5 text-xs text-red-600">
                      Please contact support with order <strong>{row.orderNumber}</strong> for assistance.
                    </p>
                  </div>
                )}

                {/* Admin note if sent */}
                {row.adminNote && row.deliveryStatus === "SENT" && (
                  <p className="mt-2 text-xs text-slate-500">Note: {row.adminNote}</p>
                )}
              </div>

              {/* Footer actions */}
              <div className="flex items-center gap-3 border-t border-slate-100 px-5 py-3">
                <Link href={`/orders/${row.orderId}`} className="text-xs font-semibold text-indigo-600 hover:underline">
                  View Order →
                </Link>
                {row.productSlug && (
                  <Link href={`/gift-codes/${row.productSlug}`} className="text-xs font-semibold text-emerald-600 hover:underline">
                    Buy Again
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

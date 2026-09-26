import Link from "next/link";
import { formatDate, formatINR, statusBadgeClass } from "@/lib/format";
import { giftAdminApi, GiftAdminApiError, type GiftDeliveryQueueResponse } from "@/lib/gift-admin-api";
import { MarkSentButton } from "../gift-actions-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Gift Deliveries" };

const DELIVERY_STATUSES = ["PENDING", "ASSIGNED", "PROCESSING", "MANUAL_REVIEW", "FAILED", "SENT"];

export default async function AdminGiftDeliveriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page || 1));

  const query = new URLSearchParams({ page: String(page), limit: "25" });
  if (sp.status) query.set("status", sp.status);
  if (sp.search) query.set("search", sp.search);

  let queue: GiftDeliveryQueueResponse | null = null;
  let error: string | null = null;

  try {
    queue = await giftAdminApi<GiftDeliveryQueueResponse>(`/deliveries/queue?${query.toString()}`);
  } catch (err) {
    error = err instanceof GiftAdminApiError ? err.message : "Failed to load the delivery queue.";
  }

  if (error || !queue) {
    return (
      <div>
        <h1 className="text-2xl font-bold">Gift Deliveries</h1>
        <div className="card mt-6 border border-red-200 bg-red-50 p-6 text-sm text-red-600">
          {error ?? "Failed to load the delivery queue."}
        </div>
      </div>
    );
  }

  const baseParams = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { status: sp.status, search: sp.search, page: undefined, ...overrides };
    if (merged.status) params.set("status", merged.status);
    if (merged.search) params.set("search", merged.search);
    if (merged.page && merged.page !== "1") params.set("page", merged.page);
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  };

  const { pagination, summary } = queue;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Gift Deliveries</h1>
          <p className="text-sm text-slate-500">
            <span className="badge bg-orange-100 text-orange-700">{summary.pending} pending</span>{" "}
            <span className="badge bg-red-100 text-red-700">{summary.overdue} overdue</span>{" "}
            <span className="badge bg-amber-100 text-amber-700">{summary.manualReview} manual review</span>
          </p>
        </div>
        <Link href="/nexora/gift-cards" className="text-sm font-semibold text-indigo-600 hover:underline">
          ← Gift dashboard
        </Link>
      </div>

      {/* Search + status filters */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <form action="/nexora/gift-cards/deliveries" method="GET" className="flex items-center gap-2">
          <input
            type="search"
            name="search"
            defaultValue={sp.search ?? ""}
            placeholder="Search order #, email, customer…"
            className="input !w-72"
          />
          {sp.status && <input type="hidden" name="status" value={sp.status} />}
          <button type="submit" className="btn-secondary !py-1.5 text-xs">
            Search
          </button>
        </form>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/nexora/gift-cards/deliveries${baseParams({ status: undefined, page: undefined })}`}
            className={`badge ${!sp.status ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}
          >
            Open queue
          </Link>
          {DELIVERY_STATUSES.map((s) => (
            <Link
              key={s}
              href={`/nexora/gift-cards/deliveries${baseParams({ status: s, page: undefined })}`}
              className={`badge ${sp.status === s ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}
            >
              {s}
            </Link>
          ))}
        </div>
      </div>

      {/* Delivery queue table */}
      <div className="card mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Recipient</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Waiting</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {queue.deliveries.map((d) => (
              <tr key={d.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <span className="font-semibold">{d.orderNumber}</span>
                  <span className="block text-xs text-slate-400">{formatDate(d.purchaseTime)}</span>
                </td>
                <td className="px-4 py-3">
                  {d.customerName}
                  <span className="block text-xs text-slate-400">{d.customerEmail}</span>
                </td>
                <td className="px-4 py-3 text-slate-600">{d.recipientEmail}</td>
                <td className="px-4 py-3">
                  {d.product}
                  <span className="block text-xs text-slate-400">
                    ₹{d.denomination} × {d.quantity}
                  </span>
                </td>
                <td className="px-4 py-3 font-semibold">{formatINR(d.amount)}</td>
                <td className="px-4 py-3 font-mono text-xs">{d.maskedCode}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${statusBadgeClass(d.deliveryStatus)}`}>{d.deliveryStatus}</span>
                  {d.overdue && <span className="badge ml-1 bg-red-100 text-red-700">overdue</span>}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {d.deliveryStatus === "SENT" || d.minutesWaiting === null
                    ? "—"
                    : `${d.minutesWaiting} min / ${d.targetMinutes}`}
                </td>
                <td className="px-4 py-3 text-right">
                  {d.deliveryStatus !== "SENT" ? (
                    <MarkSentButton deliveryId={d.id} />
                  ) : (
                    <span className="text-xs text-slate-400">sent {formatDate(d.sentAt)}</span>
                  )}
                </td>
              </tr>
            ))}
            {queue.deliveries.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-slate-400">
                  🎉 Delivery queue is clear for this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <Link
            href={`/nexora/gift-cards/deliveries${baseParams({ page: String(Math.max(1, pagination.page - 1)) })}`}
            className={`font-semibold text-indigo-600 hover:underline ${pagination.page <= 1 ? "pointer-events-none opacity-40" : ""}`}
          >
            ← Previous
          </Link>
          <span className="text-slate-500">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Link
            href={`/nexora/gift-cards/deliveries${baseParams({ page: String(Math.min(pagination.totalPages, pagination.page + 1)) })}`}
            className={`font-semibold text-indigo-600 hover:underline ${pagination.page >= pagination.totalPages ? "pointer-events-none opacity-40" : ""}`}
          >
            Next →
          </Link>
        </div>
      )}
    </div>
  );
}

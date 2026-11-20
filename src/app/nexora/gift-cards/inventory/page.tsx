import Link from "next/link";
import { formatDate, formatOrderNumber, statusBadgeClass } from "@/lib/format";
import {
  giftAdminApi,
  GiftAdminApiError,
  type GiftInventoryResponse,
  type GiftProductsResponse,
} from "@/lib/gift-admin-api";
import { InventoryActionButtons, RevealCodeButton } from "./inventory-actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Gift Inventory" };

const CODE_STATUSES = ["AVAILABLE", "RESERVED", "ASSIGNED", "SOLD", "EXPIRED", "CANCELLED"];

export default async function AdminGiftInventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; giftProductId?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page || 1));

  const query = new URLSearchParams({ page: String(page), limit: "25" });
  if (sp.status) query.set("status", sp.status);
  if (sp.giftProductId) query.set("giftProductId", sp.giftProductId);

  let inventory: GiftInventoryResponse | null = null;
  let products: GiftProductsResponse | null = null;
  let error: string | null = null;

  try {
    [inventory, products] = await Promise.all([
      giftAdminApi<GiftInventoryResponse>(`/inventory?${query.toString()}`),
      giftAdminApi<GiftProductsResponse>("/products?limit=100"),
    ]);
  } catch (err) {
    error = err instanceof GiftAdminApiError ? err.message : "Failed to load inventory.";
  }

  if (error || !inventory || !products) {
    return (
      <div>
        <h1 className="text-2xl font-bold">Gift Inventory</h1>
        <div className="card mt-6 border border-red-200 bg-red-50 p-6 text-sm text-red-600">
          {error ?? "Failed to load inventory."}
        </div>
      </div>
    );
  }

  const baseParams = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { status: sp.status, giftProductId: sp.giftProductId, page: undefined, ...overrides };
    if (merged.status) params.set("status", merged.status);
    if (merged.giftProductId) params.set("giftProductId", merged.giftProductId);
    if (merged.page && merged.page !== "1") params.set("page", merged.page);
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  };

  const { pagination } = inventory;
  const selectedProduct = products.products.find((p) => p.id === sp.giftProductId);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Gift Inventory</h1>
          <p className="text-sm text-slate-500">
            {pagination.total} code{pagination.total === 1 ? "" : "s"}
            {selectedProduct && <> for {selectedProduct.name}</>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <InventoryActionButtons products={products.products} />
          <Link href="/nexora/gift-cards" className="text-sm font-semibold text-indigo-600 hover:underline">
            ← Gift dashboard
          </Link>
        </div>
      </div>

      {/* Product stock overview */}
      <div className="card mt-6 overflow-x-auto">
        <div className="border-b border-slate-100 p-4">
          <h2 className="font-bold">Stock by product</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Product</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Sellable</th>
              <th className="px-4 py-2">Reserved</th>
              <th className="px-4 py-2">Sold</th>
              <th className="px-4 py-2">Total</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.products.map((p) => (
              <tr key={p.id} className={p.id === sp.giftProductId ? "bg-indigo-50" : "hover:bg-slate-50"}>
                <td className="px-4 py-2.5">
                  <span className="font-semibold">{p.name}</span>
                  <span className="text-slate-400"> · {p.brandName} · ₹{p.denomination}</span>
                </td>
                <td className="px-4 py-2.5">
                  <span className={`badge ${statusBadgeClass(p.status)}`}>{p.status}</span>
                </td>
                <td className="px-4 py-2.5 font-semibold">{p.stock?.sellable ?? 0}</td>
                <td className="px-4 py-2.5">{p.stock?.reserved ?? 0}</td>
                <td className="px-4 py-2.5">{p.stock?.sold ?? 0}</td>
                <td className="px-4 py-2.5 text-slate-500">{p.stock?.total ?? 0}</td>
                <td className="px-4 py-2.5 text-right">
                  <Link
                    href={`/nexora/gift-cards/inventory${baseParams({ giftProductId: p.id, page: undefined })}`}
                    className="text-xs font-semibold text-indigo-600 hover:underline"
                  >
                    {p.id === sp.giftProductId ? "Clear filter" : "View codes →"}
                  </Link>
                </td>
              </tr>
            ))}
            {products.products.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                  No gift products yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Code list filters */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Link
          href={`/nexora/gift-cards/inventory${baseParams({ status: undefined, page: undefined })}`}
          className={`badge ${!sp.status ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}
        >
          All
        </Link>
        {CODE_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/nexora/gift-cards/inventory${baseParams({ status: s, page: undefined })}`}
            className={`badge ${sp.status === s ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}
          >
            {s}
          </Link>
        ))}
      </div>

      {/* Codes table */}
      <div className="card mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Batch</th>
              <th className="px-4 py-3">Expiry</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Added</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {inventory.codes.map((code) => (
              <tr key={code.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs">{code.maskedCode}</td>
                <td className="px-4 py-3">
                  <span className="font-semibold">{code.giftProduct.name}</span>
                  <span className="text-slate-400"> · {code.giftProduct.brandName}</span>
                </td>
                <td className="px-4 py-3 text-slate-500">{code.batchLabel ?? "—"}</td>
                <td className="px-4 py-3 text-slate-500">{formatDate(code.expiryDate)}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${statusBadgeClass(code.status)}`}>{code.status}</span>
                </td>
                <td className="px-4 py-3 text-slate-500 font-mono text-xs">{code.assignedOrder?.orderNumber ? formatOrderNumber(code.assignedOrder.orderNumber) : "—"}</td>
                <td className="px-4 py-3 text-slate-500">{formatDate(code.createdAt)}</td>
                <td className="px-4 py-3">
                  <RevealCodeButton codeId={code.id} maskedCode={code.maskedCode} />
                </td>
              </tr>
            ))}
            {inventory.codes.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  No codes match this filter.
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
            href={`/nexora/gift-cards/inventory${baseParams({ page: String(Math.max(1, pagination.page - 1)) })}`}
            className={`font-semibold text-indigo-600 hover:underline ${pagination.page <= 1 ? "pointer-events-none opacity-40" : ""}`}
          >
            ← Previous
          </Link>
          <span className="text-slate-500">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Link
            href={`/nexora/gift-cards/inventory${baseParams({ page: String(Math.min(pagination.totalPages, pagination.page + 1)) })}`}
            className={`font-semibold text-indigo-600 hover:underline ${pagination.page >= pagination.totalPages ? "pointer-events-none opacity-40" : ""}`}
          >
            Next →
          </Link>
        </div>
      )}
    </div>
  );
}

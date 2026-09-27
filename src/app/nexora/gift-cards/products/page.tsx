import Link from "next/link";
import { giftAdminApi } from "@/lib/gift-admin-api";
import { formatINR } from "@/lib/format";
import {
  CreateGiftProductForm,
  CreateGiftCategoryForm,
  ProductStatusButton,
} from "../gift-admin-forms";
import { InventoryActionButtons } from "../inventory/inventory-actions";

interface GiftProduct {
  id: string;
  name: string;
  brandName: string;
  slug: string;
  denomination: number;
  sellingPrice: number;
  status: string;
  stockCount?: number;
  category?: { id: string; name: string } | null;
  featured: boolean;
}

interface GiftCategory {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  _count?: { products: number };
}

export default async function GiftProductsAdminPage() {
  let products: GiftProduct[] = [];
  let categories: GiftCategory[] = [];
  let error = "";

  try {
    const [prodRes, catRes] = await Promise.all([
      giftAdminApi<{ products: GiftProduct[] }>("/products?limit=100"),
      giftAdminApi<{ categories: GiftCategory[] }>("/categories"),
    ]);
    products = prodRes.products ?? [];
    categories = catRes.categories ?? [];
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load gift products.";
  }

  const productOptions = products.map((p) => ({
    id: p.id,
    name: p.name,
    brandName: p.brandName,
    denomination: String(p.denomination),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <nav className="text-xs text-gray-500">
            <Link href="/nexora/gift-cards" className="hover:underline">Gift Codes</Link> {" / "}
            <span className="text-gray-700">Products &amp; Codes Adder</span>
          </nav>
          <h1 className="text-2xl font-bold text-gray-900">Gift Products &amp; Codes Management</h1>
          <p className="text-xs text-gray-500">
            Create gift card SKUs, import/add voucher codes, and manage store availability.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <InventoryActionButtons products={productOptions} />
          <Link
            href="/nexora/gift-cards/inventory"
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            🔑 Codes Inventory
          </Link>
          <Link
            href="/nexora/gift-cards/deliveries"
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            📤 Deliveries Queue
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
          Backend error: {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Products list */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 p-4">
            <h2 className="text-sm font-bold text-gray-900">All Products ({products.length})</h2>
            <Link href="/nexora/gift-cards/inventory" className="text-xs text-emerald-700 hover:underline">
              Manage inventory →
            </Link>
          </div>

          {products.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500">
              No gift products yet. Use the form on the right to create your first one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-gray-100 bg-gray-50 text-[11px] uppercase text-gray-500">
                  <tr>
                    <th className="p-3">Product</th>
                    <th className="p-3">Brand</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Value</th>
                    <th className="p-3">Price</th>
                    <th className="p-3">Stock</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/50">
                      <td className="p-3">
                        <div className="font-semibold text-gray-900">{p.name}</div>
                        <div className="font-mono text-[10px] text-gray-400">{p.slug}</div>
                      </td>
                      <td className="p-3 text-gray-600">{p.brandName}</td>
                      <td className="p-3 text-gray-600">{p.category?.name ?? "—"}</td>
                      <td className="p-3 font-medium text-gray-900">{formatINR(p.denomination)}</td>
                      <td className="p-3 font-semibold text-gray-900">{formatINR(p.sellingPrice)}</td>
                      <td className="p-3">
                        <span className={`badge ${typeof p.stockCount === "number" && p.stockCount > 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                          {p.stockCount ?? 0}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`badge ${p.status === "PUBLISHED" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/nexora/gift-cards/inventory?giftProductId=${p.id}`}
                            className="rounded bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 transition whitespace-nowrap"
                            title="Add or manage gift voucher codes for this SKU"
                          >
                            + Add Codes
                          </Link>
                          <ProductStatusButton productId={p.id} currentStatus={p.status} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Sidebar forms */}
        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="text-sm font-bold text-gray-900">Create Gift Product</h2>
            <p className="mt-1 text-xs text-gray-500">
              Each product is an SKU with a fixed face value and selling price.
            </p>
            <div className="mt-4">
              <CreateGiftProductForm categories={categories} />
            </div>
          </div>

          <div className="card p-5">
            <h2 className="text-sm font-bold text-gray-900">Add Category</h2>
            <p className="mt-1 text-xs text-gray-500">
              Categories group gift products (Gaming, OTT, Shopping).
            </p>
            <div className="mt-3">
              <CreateGiftCategoryForm />
            </div>

            {categories.length > 0 && (
              <div className="mt-4 border-t border-gray-100 pt-3">
                <p className="text-[11px] font-semibold text-gray-500 uppercase">Existing Categories</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {categories.map((c) => (
                    <span key={c.id} className="badge bg-gray-100 text-gray-700">
                      {c.icon ? `${c.icon} ` : ""}{c.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


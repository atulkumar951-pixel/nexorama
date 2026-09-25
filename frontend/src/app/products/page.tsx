import Link from "next/link";
import { serverApi } from "@/lib/server-api";
import type { Pagination, ProductCard } from "@/lib/types";
import { ProductGrid } from "@/components/product/product-card";

interface ProductsResponse {
  products: ProductCard[];
  pagination: Pagination;
}

interface Props {
  searchParams: { page?: string; category?: string; productType?: string; sort?: string; free?: string };
}

const TYPES = [
  { value: "", label: "All types" },
  { value: "PDF", label: "PDF" },
  { value: "ZIP", label: "ZIP" },
  { value: "EBOOK", label: "eBook" },
  { value: "PLAYLIST", label: "Lectures" },
  { value: "BUNDLE", label: "Bundles" },
];

const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "popular", label: "Popular" },
  { value: "price_asc", label: "Price ↑" },
  { value: "price_desc", label: "Price ↓" },
];

function buildQuery(params: Record<string, string | undefined>, overrides: Record<string, string | undefined>) {
  const merged = { ...params, ...overrides };
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v) search.set(k, v);
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export default async function ProductsPage({ searchParams }: Props) {
  const { page = "1", category, productType, sort = "newest", free } = searchParams;

  let data: ProductsResponse | null = null;
  try {
    data = await serverApi<ProductsResponse>(
      `/api/products?${new URLSearchParams(
        Object.entries({ page, category, productType, sort, free }).filter(([, v]) => v) as [string, string][],
      ).toString()}`,
    );
  } catch {
    data = null;
  }

  const params = { category, productType, sort, free };

  return (
    <div className="container-page py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {category ? `Category: ${category}` : "All Products"}
          </h1>
          {data && (
            <p className="mt-1 text-sm text-gray-500">
              {data.pagination.total} product{data.pagination.total === 1 ? "" : "s"} found
            </p>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <form className="contents" action="/products" method="get">
            {Object.entries(params).map(([k, v]) => v && <input key={k} type="hidden" name={k} value={v} />)}
            <select
              name="productType"
              defaultValue={productType ?? ""}
              className="input w-auto py-2 text-sm"
              aria-label="Filter by type"
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <select name="sort" defaultValue={sort} className="input w-auto py-2 text-sm" aria-label="Sort by">
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <label className="btn-secondary cursor-pointer text-sm">
              <input type="checkbox" name="free" value="true" defaultChecked={free === "true"} className="mr-2" />
              Free only
            </label>
            <button type="submit" className="btn-primary py-2">
              Apply
            </button>
          </form>
        </div>
      </div>

      {data && data.products.length > 0 ? (
        <>
          <ProductGrid products={data.products} />

          {/* Pagination (PRD §82) */}
          {data.pagination.totalPages > 1 && (
            <nav className="mt-10 flex items-center justify-center gap-1" aria-label="Pagination">
              {data.pagination.page > 1 && (
                <Link href={`/products${buildQuery(params, { page: String(data.pagination.page - 1) })}`} className="btn-secondary py-2">
                  ← Prev
                </Link>
              )}
              {Array.from({ length: data.pagination.totalPages }, (_, i) => i + 1)
                .filter(
                  (p) =>
                    p === 1 ||
                    p === data!.pagination.totalPages ||
                    Math.abs(p - data!.pagination.page) <= 1,
                )
                .map((p, idx, arr) => (
                  <span key={p} className="flex items-center">
                    {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-2 text-gray-400">…</span>}
                    <Link
                      href={`/products${buildQuery(params, { page: String(p) })}`}
                      className={`rounded-lg px-3.5 py-2 text-sm font-medium ${
                        p === data!.pagination.page
                          ? "bg-primary-600 text-white"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {p}
                    </Link>
                  </span>
                ))}
              {data.pagination.page < data.pagination.totalPages && (
                <Link href={`/products${buildQuery(params, { page: String(data.pagination.page + 1) })}`} className="btn-secondary py-2">
                  Next →
                </Link>
              )}
            </nav>
          )}
        </>
      ) : (
        <div className="card mx-auto max-w-md p-10 text-center">
          <p className="text-4xl">📦</p>
          <h2 className="mt-3 font-semibold text-gray-900">No products found</h2>
          <p className="mt-1 text-sm text-gray-500">
            Try adjusting the filters, or check back soon — new products are added regularly.
          </p>
          <Link href="/products" className="btn-primary mt-5">
            Clear filters
          </Link>
        </div>
      )}
    </div>
  );
}

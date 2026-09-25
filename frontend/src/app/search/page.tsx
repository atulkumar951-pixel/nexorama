import { Suspense } from "react";
import { serverApi } from "@/lib/server-api";
import type { Pagination, ProductCard } from "@/lib/types";
import { ProductGrid } from "@/components/product/product-card";
import { SearchInput } from "@/components/product/search-input";

interface ProductsResponse {
  products: ProductCard[];
  pagination: Pagination;
}

interface Props {
  searchParams: { q?: string; page?: string; sort?: string };
}

export const metadata = { title: "Search" };

export default async function SearchPage({ searchParams }: Props) {
  const q = searchParams.q ?? "";
  const page = searchParams.page ?? "1";
  const sort = searchParams.sort ?? "relevance";

  let data: ProductsResponse | null = null;
  if (q) {
    try {
      data = await serverApi<ProductsResponse>(
        `/api/search?q=${encodeURIComponent(q)}&page=${page}&sort=${sort}`,
      );
    } catch {
      data = null;
    }
  }

  return (
    <div className="container-page py-10">
      <h1 className="text-2xl font-bold text-gray-900">
        {q ? `Search results for “${q}”` : "Search products"}
      </h1>

      <div className="mt-4 max-w-xl">
        <Suspense fallback={null}>
          <SearchInput initialQuery={q} />
        </Suspense>
      </div>

      {q && data && data.products.length > 0 && (
        <>
          <p className="mb-6 mt-8 text-sm text-gray-500">
            {data.pagination.total} result{data.pagination.total === 1 ? "" : "s"} found
          </p>
          <ProductGrid products={data.products} />

          {data.pagination.totalPages > 1 && (
            <div className="mt-10 flex justify-center gap-2">
              {data.pagination.page > 1 && (
                <a href={`/search?q=${encodeURIComponent(q)}&page=${data.pagination.page - 1}`} className="btn-secondary py-2">
                  ← Prev
                </a>
              )}
              {data.pagination.page < data.pagination.totalPages && (
                <a href={`/search?q=${encodeURIComponent(q)}&page=${data.pagination.page + 1}`} className="btn-secondary py-2">
                  Next →
                </a>
              )}
            </div>
          )}
        </>
      )}

      {q && (!data || data.products.length === 0) && (
        <div className="card mt-8 p-10 text-center">
          <p className="text-4xl">🔍</p>
          <h2 className="mt-3 font-semibold text-gray-900">No results found</h2>
          <p className="mt-1 text-sm text-gray-500">
            Try different keywords, or browse by category instead.
          </p>
        </div>
      )}
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { serverApi } from "@/lib/server-api";
import type { Pagination, ProductCard } from "@/lib/types";
import { ProductGrid } from "@/components/product/product-card";

interface Props {
  params: { slug: string };
  searchParams: { page?: string; sort?: string };
}

interface CategoryData {
  category: { id: string; name: string; slug: string; description?: string | null };
  products: ProductCard[];
  pagination: Pagination;
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  try {
    const res = await serverApi<{ category: { name: string; description?: string | null } }>(
      `/api/categories/${params.slug}`,
    );
    return {
      title: res.category.name,
      description: res.category.description ?? undefined,
      alternates: { canonical: `/categories/${params.slug}` },
    };
  } catch {
    return { title: "Category" };
  }
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = params;
  const page = searchParams.page ?? "1";
  const sort = searchParams.sort ?? "newest";

  let data: CategoryData | null = null;
  try {
    data = await serverApi<CategoryData>(`/api/categories/${slug}?page=${page}&sort=${sort}`);
  } catch {
    data = null;
  }

  if (!data) notFound();

  return (
    <div className="container-page py-10">
      <nav className="mb-6 flex items-center gap-2 text-sm text-gray-500" aria-label="Breadcrumb">
        <Link href="/categories" className="hover:text-primary-700">Categories</Link>
        <span>/</span>
        <span className="text-gray-700">{data.category.name}</span>
      </nav>

      <h1 className="text-2xl font-bold text-gray-900">{data.category.name}</h1>
      {data.category.description && (
        <p className="mt-1 text-sm text-gray-500">{data.category.description}</p>
      )}

      {data.products.length > 0 ? (
        <div className="mt-8">
          <ProductGrid products={data.products} />

          {data.pagination.totalPages > 1 && (
            <nav className="mt-10 flex items-center justify-center gap-1" aria-label="Pagination">
              {data.pagination.page > 1 && (
                <Link href={`/categories/${slug}?page=${data.pagination.page - 1}&sort=${sort}`} className="btn-secondary py-2">
                  ← Prev
                </Link>
              )}
              {data.pagination.page < data.pagination.totalPages && (
                <Link href={`/categories/${slug}?page=${data.pagination.page + 1}&sort=${sort}`} className="btn-secondary py-2">
                  Next →
                </Link>
              )}
            </nav>
          )}
        </div>
      ) : (
        <div className="card mt-8 p-10 text-center">
          <p className="text-4xl">📭</p>
          <h2 className="mt-3 font-semibold text-gray-900">No products in this category yet</h2>
          <Link href="/products" className="btn-primary mt-5">
            Browse all products
          </Link>
        </div>
      )}
    </div>
  );
}

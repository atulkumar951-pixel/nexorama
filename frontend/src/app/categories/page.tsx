import Link from "next/link";
import { serverApi } from "@/lib/server-api";
import type { Category } from "@/lib/types";

export const metadata = { title: "Categories" };

export default async function CategoriesPage() {
  let categories: Category[] = [];
  try {
    const res = await serverApi<{ categories: Category[] }>("/api/categories");
    categories = res.categories;
  } catch {
    categories = [];
  }

  return (
    <div className="container-page py-10">
      <h1 className="text-2xl font-bold text-gray-900">Browse Categories</h1>
      <p className="mt-1 text-sm text-gray-500">Find study material organized by subject.</p>

      {categories.length > 0 ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <div key={cat.id} className="card p-6">
              <h2 className="text-lg font-bold text-gray-900">{cat.name}</h2>
              {cat.description && <p className="mt-1 text-sm text-gray-500">{cat.description}</p>}

              {cat.children && cat.children.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {cat.children.map((child) => (
                    <Link
                      key={child.id}
                      href={`/categories/${child.slug}`}
                      className="badge bg-primary-50 text-primary-700 hover:bg-primary-100"
                    >
                      {child.name}
                    </Link>
                  ))}
                </div>
              )}

              <div className="mt-5 flex items-center justify-between">
                {cat._count && (
                  <span className="text-xs text-gray-400">
                    {cat._count.products} product{cat._count.products === 1 ? "" : "s"}
                  </span>
                )}
                <Link href={`/categories/${cat.slug}`} className="text-sm font-semibold text-primary-700 hover:underline">
                  Browse →
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card mt-8 p-10 text-center">
          <p className="text-4xl">🗂️</p>
          <h2 className="mt-3 font-semibold text-gray-900">No categories yet</h2>
          <p className="mt-1 text-sm text-gray-500">Categories will appear here once an admin creates them.</p>
        </div>
      )}
    </div>
  );
}

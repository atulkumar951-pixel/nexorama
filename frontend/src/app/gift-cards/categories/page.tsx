import Link from "next/link";
import { serverApi } from "@/lib/server-api";
import type { GiftCategory } from "@/lib/gift";

export const metadata = { title: "Gift Code Categories" };

export default async function GiftCategoriesPage() {
  const data = await serverApi<{ categories: GiftCategory[] }>("/api/gift/categories").catch(() => null);
  const categories = data?.categories ?? [];

  return (
    <div className="container-page py-10">
      <h1 className="text-2xl font-bold text-gray-900">Gift code categories</h1>
      <p className="mt-1 text-sm text-gray-500">
        Gaming, shopping, entertainment, OTT, software and more — {categories.length} categories available.
      </p>

      {categories.length === 0 ? (
        <div className="card mt-6 p-10 text-center text-sm text-gray-500">
          No gift categories are published yet. Please check back soon.
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/gift-cards?category=${encodeURIComponent(c.slug)}`}
              className="card flex items-start gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-card-hover"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-emerald-50 text-2xl">
                {c.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.image} alt={c.name} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  c.icon ?? "🎁"
                )}
              </span>
              <div className="min-w-0">
                <p className="font-bold text-gray-900">{c.name}</p>
                {c.description && <p className="mt-1 line-clamp-2 text-sm text-gray-600">{c.description}</p>}
                <p className="mt-2 text-xs font-semibold text-emerald-700">
                  {c._count?.products ?? 0} gift code{(c._count?.products ?? 0) === 1 ? "" : "s"} →
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

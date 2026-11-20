"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface GiftSearchBarProps {
  initialQuery?: string;
  isFiltered?: boolean;
}

export function GiftSearchBar({
  initialQuery = "",
  isFiltered = false,
}: GiftSearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const router = useRouter();

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();

    // Instantly hide mobile hero contents upon hitting search
    if (typeof document !== "undefined") {
      document.querySelectorAll(".mobile-search-hide").forEach((el) => {
        el.classList.add("hidden");
      });
    }

    if (q) {
      router.push(`/gift-codes?q=${encodeURIComponent(q)}`);
    } else {
      router.push("/gift-codes");
    }
  };

  return (
    <form
      onSubmit={handleSearch}
      className={`flex max-w-xl items-center gap-2 rounded-2xl border border-slate-300 bg-white p-1.5 shadow-md shadow-emerald-100/50 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-200 transition ${
        isFiltered ? "mt-1 lg:mt-5" : "mt-5"
      }`}
    >
      <span className="pl-3 text-base text-slate-400">🔍</span>
      <input
        type="search"
        name="q"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search Amazon, Steam, Google Play, Netflix, Spotify…"
        className="w-full bg-transparent px-2 py-1.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
        aria-label="Search gift cards"
      />
      <button
        type="submit"
        className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2 text-sm font-bold text-white shadow-md shadow-emerald-200 hover:from-emerald-500 hover:to-teal-500 transition active:scale-95 whitespace-nowrap"
      >
        Find Codes
      </button>
    </form>
  );
}

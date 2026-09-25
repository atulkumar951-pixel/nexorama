"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useMarketplace } from "@/lib/marketplace-context";
import { UserMenu } from "./user-menu";

export function Header() {
  const { user, loading } = useAuth();
  const { isGiftMode, setMode } = useMarketplace();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => setMenuOpen(false), [pathname]);

  const navLinks = isGiftMode
    ? [
        { href: "/gift-cards", label: "All Gift Cards" },
        { href: "/gift-cards/categories", label: "Categories" },
        { href: "/gift-cards/vault", label: "My Gift Codes" },
      ]
    : [
        { href: "/products", label: "All Products" },
        { href: "/categories", label: "Categories" },
      ];

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = search.trim();
    if (!q) return;
    if (isGiftMode) {
      router.push(`/gift-cards?q=${encodeURIComponent(q)}`);
    } else {
      router.push(`/search?q=${encodeURIComponent(q)}`);
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="container-page flex h-16 items-center gap-4">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span
            className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg font-bold text-white ${
              isGiftMode ? "bg-amber-600" : "bg-primary-600"
            }`}
          >
            {isGiftMode ? "🎁" : "D"}
          </span>
          <span className="hidden text-lg font-bold text-gray-900 sm:block">
            {isGiftMode ? (
              <>
                Gift<span className="text-amber-600">Vault</span>
              </>
            ) : (
              <>
                Digital<span className="text-primary-600">Market</span>
              </>
            )}
          </span>
        </Link>

        {/* Mode Switcher Pill */}
        <div className="hidden items-center rounded-full bg-gray-100 p-1 text-xs font-semibold sm:flex">
          <button
            type="button"
            onClick={() => setMode("DIGITAL")}
            className={`rounded-full px-3 py-1 transition ${
              !isGiftMode ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
            }`}
          >
            Digital
          </button>
          <button
            type="button"
            onClick={() => setMode("GIFT_CODES")}
            className={`flex items-center gap-1 rounded-full px-3 py-1 transition ${
              isGiftMode ? "bg-amber-500 text-white shadow-sm" : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <span>🎁</span> Gift Cards
          </button>
        </div>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-100 ${
                pathname.startsWith(link.href)
                  ? isGiftMode
                    ? "text-amber-700"
                    : "text-primary-700"
                  : "text-gray-700"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <form onSubmit={submitSearch} className="ml-auto hidden max-w-sm flex-1 md:block" role="search">
          <div className="relative">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isGiftMode ? "Search gift cards & brands…" : "Search products…"}
              aria-label="Search"
              className="input pl-9"
            />
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
            </svg>
          </div>
        </form>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          {isGiftMode && (
            <Link
              href="/gift-cards/cart"
              className="relative rounded-lg p-2 text-gray-700 hover:bg-gray-100"
              title="Gift Card Cart"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
            </Link>
          )}

          {loading ? (
            <div className="h-9 w-24 animate-pulse rounded-lg bg-gray-100" />
          ) : user ? (
            <UserMenu />
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="btn-secondary">
                Sign in
              </Link>
              <Link
                href="/register"
                className={`hidden sm:inline-flex ${isGiftMode ? "btn-primary bg-amber-600 hover:bg-amber-700" : "btn-primary"}`}
              >
                Get started
              </Link>
            </div>
          )}

          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-lg p-2 text-gray-700 hover:bg-gray-100 lg:hidden"
            aria-label="Open menu"
            aria-expanded={menuOpen}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-gray-200 bg-white lg:hidden">
          <div className="container-page space-y-2 py-3">
            <div className="flex items-center justify-between rounded-lg bg-gray-100 p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setMode("DIGITAL")}
                className={`flex-1 rounded-md py-1.5 transition ${
                  !isGiftMode ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                }`}
              >
                Digital
              </button>
              <button
                type="button"
                onClick={() => setMode("GIFT_CODES")}
                className={`flex-1 rounded-md py-1.5 transition ${
                  isGiftMode ? "bg-amber-500 text-white shadow-sm" : "text-gray-500"
                }`}
              >
                Gift Cards
              </button>
            </div>

            <form onSubmit={submitSearch} className="md:hidden" role="search">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isGiftMode ? "Search gift cards & brands…" : "Search products…"}
                aria-label="Search"
                className="input"
              />
            </form>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                {link.label}
              </Link>
            ))}
            {!user && (
              <Link
                href="/register"
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-primary-700 hover:bg-primary-50"
              >
                Create account
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

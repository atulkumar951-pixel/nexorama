import Link from "next/link";
import { db } from "@/db";
import { cartItems, notifications } from "@/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { logoutAction } from "@/lib/actions/auth-actions";
import { getMarketplaceMode } from "@/lib/marketplace-mode";

export default async function Header() {
  const user = await getCurrentUser();
  const mode = await getMarketplaceMode();
  const isGift = mode === "GIFT_CODES";

  let cartCount = 0;
  let unread = 0;
  if (user) {
    const [c] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(cartItems)
      .where(eq(cartItems.userId, user.id));
    cartCount = c?.count ?? 0;
    const [n] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));
    unread = n?.count ?? 0;
  }

  return (
    <header
      className={`sticky top-0 z-40 border-b backdrop-blur-md transition-colors ${
        isGift
          ? "border-slate-800 bg-slate-950/95 text-slate-100"
          : "border-slate-200 bg-white/95 text-slate-900"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 sm:gap-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5 group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Nexora"
            className="h-9 w-9 rounded-lg object-contain shadow-sm group-hover:scale-105 transition duration-200"
          />
          <span className={`text-xl font-black tracking-tight ${isGift ? "text-white" : "text-slate-900"}`}>
            Nex<span className="text-emerald-400">ora</span>
          </span>
          {isGift && (
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-950/70 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-400 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              GIFT CODES
            </span>
          )}
        </Link>

        <nav
          className={`hidden items-center gap-5 text-sm font-semibold md:flex ${
            isGift ? "text-slate-300" : "text-slate-600"
          }`}
        >
          {isGift ? (
            <>
              <Link href="/gift-codes" className="hover:text-emerald-400 transition">
                Gift Cards
              </Link>
              <Link href="/categories" className="hover:text-emerald-400 transition">
                Categories
              </Link>
              {user && (
                <Link href="/my-gift-codes" className="hover:text-emerald-400 transition">
                  My Gift Codes
                </Link>
              )}
              {user && (
                <Link href="/orders" className="hover:text-emerald-400 transition">
                  Orders
                </Link>
              )}
            </>
          ) : (
            <>
              <Link href="/products" className="hover:text-indigo-600 transition">
                Marketplace
              </Link>
              <Link href="/categories" className="hover:text-indigo-600 transition">
                Categories
              </Link>
              {user && (
                <Link href="/library" className="hover:text-indigo-600 transition">
                  My Library
                </Link>
              )}
            </>
          )}
        </nav>

        <form action={isGift ? "/gift-codes" : "/products"} className="ml-auto hidden flex-1 max-w-md sm:block">
          <input
            type="search"
            name="q"
            placeholder={isGift ? "Search Steam, Amazon, Google Play, Netflix…" : "Search notes, books, courses…"}
            className={`w-full rounded-full border px-4 py-2 text-sm focus:outline-none transition ${
              isGift
                ? "border-slate-800 bg-slate-900 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                : "border-slate-300 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            }`}
            aria-label="Search products"
          />
        </form>

        <div className="ml-auto flex items-center gap-1 sm:ml-0 sm:gap-2">
          {user ? (
            <>
              <Link
                href="/wishlist"
                title="Wishlist"
                className={`rounded-lg p-2 transition ${
                  isGift ? "text-slate-300 hover:bg-slate-850 hover:text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                ♡
              </Link>
              <Link
                href="/notifications"
                title="Notifications"
                className={`relative rounded-lg p-2 transition ${
                  isGift ? "text-slate-300 hover:bg-slate-850 hover:text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                🔔
                {unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {unread}
                  </span>
                )}
              </Link>
              <Link
                href="/cart"
                title="Cart"
                className={`relative rounded-lg p-2 transition ${
                  isGift ? "text-slate-300 hover:bg-slate-850 hover:text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                🛒
                {cartCount > 0 && (
                  <span
                    className={`absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                      isGift ? "bg-emerald-500 text-slate-950" : "bg-indigo-600 text-white"
                    }`}
                  >
                    {cartCount}
                  </span>
                )}
              </Link>
              <div className="group relative">
                <button
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold shadow-sm ${
                    isGift
                      ? "border border-emerald-500/40 bg-emerald-950 text-emerald-400"
                      : "bg-indigo-100 text-indigo-700"
                  }`}
                >
                  {user.name.charAt(0).toUpperCase()}
                </button>
                <div className="invisible absolute right-0 top-full z-50 w-56 pt-2 opacity-0 transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                  <div
                    className={`rounded-2xl border py-1 text-sm shadow-2xl ${
                      isGift
                        ? "border-slate-800 bg-slate-900 text-slate-200"
                        : "border-slate-200 bg-white text-slate-800"
                    }`}
                  >
                    <div className={`border-b px-4 py-2.5 ${isGift ? "border-slate-800" : "border-slate-100"}`}>
                      <p className={`font-bold ${isGift ? "text-white" : "text-slate-900"}`}>{user.name}</p>
                      <p className="truncate text-xs text-slate-400">{user.email}</p>
                    </div>
                    <Link
                      href="/dashboard"
                      className={`block px-4 py-2 transition ${
                        isGift ? "hover:bg-slate-800 hover:text-white" : "hover:bg-slate-50"
                      }`}
                    >
                      Dashboard
                    </Link>
                    {isGift ? (
                      <Link
                        href="/my-gift-codes"
                        className={`block px-4 py-2 font-semibold text-emerald-400 transition ${
                          isGift ? "hover:bg-slate-800" : "hover:bg-emerald-50"
                        }`}
                      >
                        🎁 My Gift Codes
                      </Link>
                    ) : (
                      <Link
                        href="/library"
                        className={`block px-4 py-2 transition ${
                          isGift ? "hover:bg-slate-800" : "hover:bg-slate-50"
                        }`}
                      >
                        My Library
                      </Link>
                    )}
                    <Link
                      href="/orders"
                      className={`block px-4 py-2 transition ${
                        isGift ? "hover:bg-slate-800 hover:text-white" : "hover:bg-slate-50"
                      }`}
                    >
                      My Orders
                    </Link>
                    <Link
                      href="/profile"
                      className={`block px-4 py-2 transition ${
                        isGift ? "hover:bg-slate-800 hover:text-white" : "hover:bg-slate-50"
                      }`}
                    >
                      Profile &amp; Settings
                    </Link>
                    {isAdmin(user) && (
                      <Link
                        href="/nexora"
                        className={`block px-4 py-2 font-bold text-emerald-400 transition ${
                          isGift ? "hover:bg-slate-800" : "hover:bg-emerald-50"
                        }`}
                      >
                        Admin Panel
                      </Link>
                    )}
                    <form action={logoutAction}>
                      <button
                        className={`block w-full px-4 py-2 text-left text-red-400 transition ${
                          isGift ? "hover:bg-slate-800" : "hover:bg-red-50"
                        }`}
                      >
                        Sign out
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                  isGift
                    ? "border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                    : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className={`rounded-xl px-4 py-2 text-xs font-bold shadow-md transition ${
                  isGift
                    ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-emerald-500/20"
                    : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/20"
                }`}
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Nav Bar */}
      <nav
        className={`flex items-center gap-4 overflow-x-auto border-t px-4 py-2 text-xs font-semibold md:hidden ${
          isGift ? "border-slate-800/80 bg-slate-950 text-slate-300" : "border-slate-100 bg-white text-slate-600"
        }`}
      >
        {isGift ? (
          <>
            <Link href="/gift-codes" className="whitespace-nowrap hover:text-emerald-400">
              Gift Cards
            </Link>
            <Link href="/categories" className="whitespace-nowrap hover:text-emerald-400">
              Categories
            </Link>
            {user && (
              <Link href="/my-gift-codes" className="whitespace-nowrap hover:text-emerald-400">
                My Gift Codes
              </Link>
            )}
            {user && (
              <Link href="/orders" className="whitespace-nowrap hover:text-emerald-400">
                Orders
              </Link>
            )}
          </>
        ) : (
          <>
            <Link href="/products" className="whitespace-nowrap hover:text-indigo-600">
              Marketplace
            </Link>
            <Link href="/categories" className="whitespace-nowrap hover:text-indigo-600">
              Categories
            </Link>
            {user && (
              <Link href="/library" className="whitespace-nowrap hover:text-indigo-600">
                My Library
              </Link>
            )}
            {user && (
              <Link href="/orders" className="whitespace-nowrap hover:text-indigo-600">
                Orders
              </Link>
            )}
          </>
        )}
      </nav>
    </header>
  );
}

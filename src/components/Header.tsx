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
    try {
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
    } catch (err: any) {
      console.warn("Header: Failed to fetch cart/notifications:", err?.message || err);
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/95 backdrop-blur-md text-slate-900 transition-colors">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 sm:gap-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5 group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={isGift ? "/logo-gift.png" : "/logo.png"}
            alt="Nexora"
            className="h-9 w-9 rounded-lg object-contain shadow-sm group-hover:scale-105 transition duration-200"
          />
          <span className="text-xl font-black tracking-tight text-slate-900">
            Nex<span className="text-emerald-600">ora</span>
          </span>
          {isGift && (
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-800 shadow-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              GIFT CODES
            </span>
          )}
        </Link>

        <nav className="hidden items-center gap-5 text-sm font-semibold text-slate-600 md:flex">
          {isGift ? (
            <>
              <Link href="/gift-codes" className="hover:text-emerald-600 transition">
                Gift Cards
              </Link>
              <Link href="/categories" className="hover:text-emerald-600 transition">
                Categories
              </Link>
              {user && (
                <Link href="/my-gift-codes" className="hover:text-emerald-600 transition">
                  My Gift Codes
                </Link>
              )}
              {user && (
                <Link href="/orders" className="hover:text-emerald-600 transition">
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
            className="w-full rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200 transition"
            aria-label="Search products"
          />
        </form>

        <div className="ml-auto flex items-center gap-1 sm:ml-0 sm:gap-2">
          {user ? (
            <>
              <Link
                href="/wishlist"
                title="Wishlist"
                className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 transition"
              >
                ♡
              </Link>
              <Link
                href="/notifications"
                title="Notifications"
                className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100 transition"
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
                className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100 transition"
              >
                🛒
                {cartCount > 0 && (
                  <span
                    className={`absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                      isGift ? "bg-emerald-600 text-white" : "bg-indigo-600 text-white"
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
                      ? "border border-emerald-200 bg-emerald-100 text-emerald-800"
                      : "bg-indigo-100 text-indigo-700"
                  }`}
                >
                  {user.name.charAt(0).toUpperCase()}
                </button>
                <div className="invisible absolute right-0 top-full z-50 w-56 pt-2 opacity-0 transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                  <div className="rounded-2xl border border-slate-200 bg-white py-1 text-sm shadow-xl text-slate-800">
                    <div className="border-b border-slate-100 px-4 py-2.5">
                      <p className="font-bold text-slate-900">{user.name}</p>
                      <p className="truncate text-xs text-slate-500">{user.email}</p>
                    </div>
                    {!isGift && (
                      <Link
                        href="/dashboard"
                        className="block px-4 py-2 hover:bg-slate-50 transition"
                      >
                        Dashboard
                      </Link>
                    )}
                    {isGift ? (
                      <Link
                        href="/my-gift-codes"
                        className="block px-4 py-2 font-semibold text-emerald-700 hover:bg-emerald-50 transition"
                      >
                        🎁 My Gift Codes
                      </Link>
                    ) : (
                      <Link
                        href="/library"
                        className="block px-4 py-2 hover:bg-slate-50 transition"
                      >
                        My Library
                      </Link>
                    )}
                    <Link
                      href="/orders"
                      className="block px-4 py-2 hover:bg-slate-50 transition"
                    >
                      My Orders
                    </Link>
                    <Link
                      href="/profile"
                      className="block px-4 py-2 hover:bg-slate-50 transition"
                    >
                      Profile &amp; Settings
                    </Link>
                    {isAdmin(user) && (
                      <Link
                        href="/nexora"
                        className="block px-4 py-2 font-bold text-emerald-700 hover:bg-emerald-50 transition"
                      >
                        Admin Panel
                      </Link>
                    )}
                    <form action={logoutAction}>
                      <button
                        className="block w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 transition"
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
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className={`rounded-xl px-4 py-2 text-xs font-bold text-white shadow-md transition ${
                  isGift
                    ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200"
                    : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200"
                }`}
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Nav Bar */}
      <nav className="flex items-center gap-4 overflow-x-auto border-t border-slate-100 bg-white px-4 py-2 text-xs font-semibold text-slate-600 md:hidden">
        {isGift ? (
          <>
            <Link href="/gift-codes" className="whitespace-nowrap hover:text-emerald-600">
              Gift Cards
            </Link>
            <Link href="/categories" className="whitespace-nowrap hover:text-emerald-600">
              Categories
            </Link>
            {user && (
              <Link href="/my-gift-codes" className="whitespace-nowrap hover:text-emerald-600">
                My Gift Codes
              </Link>
            )}
            {user && (
              <Link href="/orders" className="whitespace-nowrap hover:text-emerald-600">
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

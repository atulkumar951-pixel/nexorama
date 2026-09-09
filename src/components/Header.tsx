import Link from "next/link";
import { db } from "@/db";
import { cartItems, notifications } from "@/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { logoutAction } from "@/lib/actions/auth-actions";

export default async function Header() {
  const user = await getCurrentUser();
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
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 sm:gap-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5 group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Nexora" className="h-9 w-9 rounded-lg object-contain shadow-sm group-hover:scale-105 transition duration-200" />
          <span className="text-xl font-black tracking-tight text-slate-900">
            Nex<span className="text-emerald-600">ora</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-5 text-sm font-medium text-slate-600 md:flex">
          <Link href="/products" className="hover:text-indigo-600">Marketplace</Link>
          <Link href="/categories" className="hover:text-indigo-600">Categories</Link>
          {user && <Link href="/library" className="hover:text-indigo-600">My Library</Link>}
        </nav>

        <form action="/products" className="ml-auto hidden flex-1 max-w-md sm:block">
          <input
            type="search"
            name="q"
            placeholder="Search notes, books, courses…"
            className="w-full rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            aria-label="Search products"
          />
        </form>

        <div className="ml-auto flex items-center gap-1 sm:ml-0 sm:gap-2">
          {user ? (
            <>
              <Link href="/wishlist" title="Wishlist" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100">♡</Link>
              <Link href="/notifications" title="Notifications" className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100">
                🔔
                {unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {unread}
                  </span>
                )}
              </Link>
              <Link href="/cart" title="Cart" className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100">
                🛒
                {cartCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white">
                    {cartCount}
                  </span>
                )}
              </Link>
              <div className="group relative">
                <button className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                  {user.name.charAt(0).toUpperCase()}
                </button>
                <div className="invisible absolute right-0 top-full z-50 w-52 pt-2 opacity-0 transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                  <div className="card overflow-hidden py-1 text-sm">
                    <div className="border-b border-slate-100 px-4 py-2">
                      <p className="font-semibold text-slate-900">{user.name}</p>
                      <p className="truncate text-xs text-slate-500">{user.email}</p>
                    </div>
                    <Link href="/dashboard" className="block px-4 py-2 hover:bg-slate-50">Dashboard</Link>
                    <Link href="/library" className="block px-4 py-2 hover:bg-slate-50">My Library</Link>
                    <Link href="/orders" className="block px-4 py-2 hover:bg-slate-50">My Orders</Link>
                    <Link href="/profile" className="block px-4 py-2 hover:bg-slate-50">Profile & Settings</Link>
                    {isAdmin(user) && (
                      <Link href="/admin" className="block px-4 py-2 font-semibold text-indigo-600 hover:bg-indigo-50">Admin Panel</Link>
                    )}
                    <form action={logoutAction}>
                      <button className="block w-full px-4 py-2 text-left text-red-600 hover:bg-red-50">Sign out</button>
                    </form>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-secondary !py-2">Sign in</Link>
              <Link href="/register" className="btn-primary !py-2">Sign up</Link>
            </>
          )}
        </div>
      </div>
      {/* Mobile nav */}
      <nav className="flex items-center gap-4 overflow-x-auto border-t border-slate-100 px-4 py-2 text-sm font-medium text-slate-600 md:hidden">
        <Link href="/products">Marketplace</Link>
        <Link href="/categories">Categories</Link>
        {user && <Link href="/library">My Library</Link>}
        {user && <Link href="/orders">Orders</Link>}
      </nav>
    </header>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { logoutAction } from "@/lib/actions/auth-actions";
import { getMarketplaceMode } from "@/lib/marketplace-mode";

const NAV = [
  { href: "/nexora", label: "Dashboard", icon: "📊" },
  { href: "/nexora/products", label: "Products", icon: "📦" },
  { href: "/nexora/categories", label: "Categories", icon: "🗂️" },
  { href: "/nexora/orders", label: "Orders", icon: "🧾" },
  { href: "/nexora/payments", label: "Payments", icon: "💳" },
  { href: "/nexora/users", label: "Users", icon: "👥" },
  { href: "/nexora/coupons", label: "Coupons", icon: "🏷️" },
  { href: "/nexora/gift-cards", label: "Gift Codes", icon: "🎁" },
  { href: "/nexora/banners", label: "Banners", icon: "🖼️" },
  { href: "/nexora/notifications", label: "Notifications", icon: "🔔" },
  { href: "/nexora/audit-logs", label: "Audit Logs", icon: "🛡️" },
  { href: "/nexora/settings", label: "Settings", icon: "⚙️" },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/nexora");
  if (!isAdmin(user)) redirect("/dashboard");

  const mode = await getMarketplaceMode();

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-800 bg-slate-900 text-slate-300 lg:flex">
        <Link href="/nexora" className="flex items-center gap-2.5 border-b border-slate-800 px-5 py-4 text-lg font-extrabold text-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Nexora" className="h-7 w-7 rounded-md object-contain" />
          <span>Nex<span className="text-emerald-400">ora</span> Admin</span>
        </Link>
        <nav className="flex-1 space-y-0.5 p-3">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-slate-800 hover:text-white">
              <span>{n.icon}</span> {n.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-slate-800 p-4 text-xs">
          <p className="font-semibold text-white">{user.name}</p>
          <p className="capitalize text-slate-400">{user.role.replace("_", " ")}</p>
          <div className="mt-3 flex gap-3">
            <Link href="/" className="text-indigo-400 hover:underline">View store</Link>
            <form action={logoutAction}>
              <button className="text-red-400 hover:underline">Sign out</button>
            </form>
          </div>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        {/* Top Mode Indicator Bar (PRD §108) */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2.5 shadow-sm sm:px-8">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Current Mode:</span>
            {mode === "GIFT_CODES" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-0.5 text-xs font-bold text-emerald-800">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                🟢 GIFT CODES MODE
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-300 bg-blue-50 px-3 py-0.5 text-xs font-bold text-blue-800">
                <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                🔵 DIGITAL MARKETPLACE
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs">
            <Link
              href="/nexora/settings"
              className="rounded bg-slate-100 px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-200 transition"
            >
              ⚙️ Switch Mode / Settings
            </Link>
            <Link href="/" target="_blank" className="font-medium text-indigo-600 hover:underline">
              Preview Storefront ↗
            </Link>
          </div>
        </div>

        {/* Mobile admin nav */}
        <div className="flex items-center gap-3 overflow-x-auto border-b border-slate-200 bg-slate-900 px-4 py-3 text-sm text-slate-300 lg:hidden">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="whitespace-nowrap hover:text-white">{n.icon} {n.label}</Link>
          ))}
        </div>
        <main className="p-4 sm:p-8">{children}</main>
      </div>
    </div>
  );
}

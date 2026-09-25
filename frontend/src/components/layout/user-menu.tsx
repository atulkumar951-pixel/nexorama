"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";

const MENU_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/library", label: "My Library" },
  { href: "/orders", label: "Orders" },
  { href: "/wishlist", label: "Wishlist" },
  { href: "/notifications", label: "Notifications" },
  { href: "/settings", label: "Account Settings" },
];

export function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!user) return null;

  async function handleLogout() {
    setOpen(false);
    await logout();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full p-1 hover:bg-gray-100"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
      >
        {user.profileImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.profileImage} alt="" className="h-8 w-8 rounded-full object-cover" />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
            {user.name.charAt(0).toUpperCase()}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-card-hover"
        >
          <div className="border-b border-gray-100 px-4 py-2.5">
            <p className="truncate text-sm font-semibold text-gray-900">{user.name}</p>
            <p className="truncate text-xs text-gray-500">{user.email}</p>
          </div>
          {MENU_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              {item.label}
            </Link>
          ))}
          <button
            onClick={handleLogout}
            role="menuitem"
            className="block w-full px-4 py-2 text-left text-sm text-danger-600 hover:bg-danger-50"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

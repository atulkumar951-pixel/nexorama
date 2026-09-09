import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-slate-900 text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Link href="/" className="flex items-center gap-2 text-lg font-extrabold text-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Nexora" className="h-8 w-8 rounded-md object-contain" />
            <span>Nex<span className="text-emerald-400">ora</span></span>
          </Link>
          <p className="mt-3 text-sm text-slate-400">
            Your Digital Knowledge Marketplace — Premium notes, eBooks, code bundles and lecture playlists.
          </p>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-white">Marketplace</p>
          <ul className="space-y-2 text-sm">
            <li><Link href="/products" className="hover:text-white">All Products</Link></li>
            <li><Link href="/categories" className="hover:text-white">Categories</Link></li>
            <li><Link href="/products?filter=free" className="hover:text-white">Free Resources</Link></li>
            <li><Link href="/products?sort=popular" className="hover:text-white">Popular</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-white">Account</p>
          <ul className="space-y-2 text-sm">
            <li><Link href="/library" className="hover:text-white">My Library</Link></li>
            <li><Link href="/orders" className="hover:text-white">My Orders</Link></li>
            <li><Link href="/wishlist" className="hover:text-white">Wishlist</Link></li>
            <li><Link href="/notifications" className="hover:text-white">Notifications</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-white">Legal</p>
          <ul className="space-y-2 text-sm">
            <li><Link href="/terms" className="hover:text-white">Terms &amp; Conditions</Link></li>
            <li><Link href="/privacy" className="hover:text-white">Privacy Policy</Link></li>
            <li><Link href="/refund-policy" className="hover:text-white">Refund Policy</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-800 py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Nexora. All rights reserved. Learn · Download · Grow
      </div>
    </footer>
  );
}

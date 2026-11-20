import Link from "next/link";
import { getMarketplaceMode } from "@/lib/marketplace-mode";

export default async function Footer() {
  const mode = await getMarketplaceMode();
  const isGift = mode === "GIFT_CODES";

  if (isGift) {
    return (
      <footer className="mt-20 border-t border-slate-800 bg-slate-950 text-slate-300">
        {/* Top Trust & Value Guarantee Strip (Gyftr / E2Z Store Style) */}
        <div className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-6 sm:grid-cols-4 lg:gap-8">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-xl text-emerald-400 border border-emerald-500/20">
                ⚡
              </span>
              <div>
                <p className="text-xs font-bold text-white uppercase tracking-wider">Instant Digital Delivery</p>
                <p className="text-[11px] text-slate-400">Codes provided instantly upon payment</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-xl text-cyan-400 border border-cyan-500/20">
                🛡️
              </span>
              <div>
                <p className="text-xs font-bold text-white uppercase tracking-wider">100% Genuine Codes</p>
                <p className="text-[11px] text-slate-400">Authentic brand vouchers guaranteed</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-xl text-amber-400 border border-amber-500/20">
                🔒
              </span>
              <div>
                <p className="text-xs font-bold text-white uppercase tracking-wider">Safe Razorpay UPI</p>
                <p className="text-[11px] text-slate-400">256-bit bank-grade encryption</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-xl text-violet-400 border border-violet-500/20">
                🎧
              </span>
              <div>
                <p className="text-xs font-bold text-white uppercase tracking-wider">24/7 Ops Support</p>
                <p className="text-[11px] text-slate-400">Real-time tracking &amp; query resolution</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Footer Links */}
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand & Bio */}
          <div>
            <Link href="/" className="flex items-center gap-2.5 text-lg font-extrabold text-white group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Nexora" className="h-8 w-8 rounded-lg object-contain shadow-sm" />
              <span>
                Nex<span className="text-emerald-400">ora</span>{" "}
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Gift Codes</span>
              </span>
            </Link>
            <p className="mt-3 text-xs leading-relaxed text-slate-400">
              India&apos;s trusted digital vouchers and gaming currency portal. Buy official gift cards for Steam, Google Play, Amazon, Netflix, Spotify &amp; top brands with instant delivery.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3 py-1 text-[11px] font-semibold text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              ⚡ Instant Digital Code Delivery Guaranteed
            </div>
            <div className="mt-5 flex items-center gap-2 text-xs text-slate-400">
              <span className="text-slate-500">Accepted:</span>
              <span className="rounded bg-slate-900 border border-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-300">UPI</span>
              <span className="rounded bg-slate-900 border border-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-300">Cards</span>
              <span className="rounded bg-slate-900 border border-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-300">NetBanking</span>
            </div>
          </div>

          {/* Top Voucher Categories */}
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-emerald-400">Popular Categories</p>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <Link href="/gift-codes" className="hover:text-white transition">
                  🎮 Gaming &amp; Credits (Steam, Play, Xbox)
                </Link>
              </li>
              <li>
                <Link href="/gift-codes" className="hover:text-white transition">
                  🎬 OTT &amp; Streaming (Netflix, Spotify, Prime)
                </Link>
              </li>
              <li>
                <Link href="/gift-codes" className="hover:text-white transition">
                  🛍️ Shopping Vouchers (Amazon, Flipkart)
                </Link>
              </li>
              <li>
                <Link href="/gift-codes" className="hover:text-white transition">
                  🍔 Food &amp; Dining (Swiggy, Zomato)
                </Link>
              </li>
              <li>
                <Link href="/gift-codes" className="hover:text-white transition">
                  ✈️ Travel &amp; Lifestyle (MakeMyTrip, Uber)
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer & Account */}
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-emerald-400">Customer Corner</p>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <Link href="/gift-codes" className="hover:text-white transition">
                  🎁 Browse All Gift Cards
                </Link>
              </li>
              <li>
                <Link href="/my-gift-codes" className="hover:text-white transition">
                  🔑 My Gift Codes &amp; Deliveries
                </Link>
              </li>
              <li>
                <Link href="/orders" className="hover:text-white transition">
                  🧾 Order History &amp; Receipts
                </Link>
              </li>
              <li>
                <Link href="/cart" className="hover:text-white transition">
                  🛒 View Cart
                </Link>
              </li>
              <li>
                <Link href="/gift-codes#how-it-works" className="hover:text-white transition">
                  💡 How Code Delivery Works
                </Link>
              </li>
            </ul>
          </div>

          {/* Support & Legal */}
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-emerald-400">Assurance &amp; Legal</p>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <Link href="/contact" className="flex items-center gap-1.5 font-semibold text-emerald-400 hover:text-emerald-300 transition">
                  ✉ Contact 24/7 Ops Desk
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white transition">
                  📜 Gift Card Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white transition">
                  🔒 Privacy &amp; Data Protection
                </Link>
              </li>
              <li>
                <Link href="/refund-policy" className="hover:text-white transition">
                  ⚠️ Non-Refundable Policy (Instant Codes)
                </Link>
              </li>
            </ul>
            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/80 p-3 text-[11px] text-slate-400">
              <span className="font-semibold text-slate-300">🛡️ Buyer Protection:</span> All codes are stored encrypted and revealed only to the verified purchaser via email.
            </div>
          </div>
        </div>

        {/* Disclaimer & Copyright Strip */}
        <div className="border-t border-slate-800/80 bg-slate-950 py-5 text-center text-[11px] text-slate-500">
          <div className="mx-auto max-w-7xl px-4 space-y-2">
            <p className="leading-relaxed">
              <strong>Disclaimer:</strong> All brand logos, trademarks, and registered names (Amazon, Steam, Google Play, Netflix, Apple, etc.) are the property of their respective trademark holders. Nexora is an independent digital voucher aggregator. Digital codes are single-use, non-refundable once delivered, and subject to brand redemption terms.
            </p>
            <p className="text-slate-400 font-medium">
              © {new Date().getFullYear()} Nexora Gift Cards &amp; Vouchers. Fast · Genuine · 100% Guaranteed.
            </p>
          </div>
        </div>
      </footer>
    );
  }

  // Default Digital Marketplace Footer
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
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-white">Support &amp; Legal</p>
          <ul className="space-y-2 text-sm">
            <li><Link href="/contact" className="flex items-center gap-1.5 font-semibold text-emerald-400 hover:text-emerald-300">✉ Contact Us</Link></li>
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

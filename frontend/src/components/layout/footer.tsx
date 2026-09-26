import Link from "next/link";

const FOOTER_LINKS: Array<{ title: string; links: Array<{ href: string; label: string }> }> = [
  {
    title: "Explore",
    links: [
      { href: "/products", label: "All Products" },
      { href: "/categories", label: "Categories" },
      { href: "/search", label: "Search" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/library", label: "My Library" },
      { href: "/orders", label: "Orders" },
      { href: "/wishlist", label: "Wishlist" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/terms", label: "Terms & Conditions" },
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/refund-policy", label: "Refund Policy" },
      { href: "/contact", label: "Contact" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="container-page py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-lg font-bold text-white">
                D
              </span>
              <span className="text-lg font-bold text-gray-900">
                Digital<span className="text-primary-600">Market</span>
              </span>
            </Link>
            <p className="mt-3 max-w-xs text-sm text-gray-500">
              Premium digital study material — notes, eBooks, resources and lecture series. Instant
              access after purchase.
            </p>
          </div>

          {FOOTER_LINKS.map((group) => (
            <div key={group.title}>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
                {group.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-gray-500 hover:text-primary-700">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-gray-100 pt-6 text-sm text-gray-400">
          © {new Date().getFullYear()} Digital Marketplace. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

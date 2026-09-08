import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "DigiMart — Digital Products & Learning Marketplace",
    template: "%s | DigiMart",
  },
  description:
    "Buy premium notes, eBooks, study material, code packs and lecture courses. Instant delivery to your personal library.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}

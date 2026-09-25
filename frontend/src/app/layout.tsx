import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { MarketplaceProvider } from "@/lib/marketplace-context";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: {
    default: "Digital Marketplace — Learn with premium study material & digital gift cards",
    template: "%s | Digital Marketplace",
  },
  description:
    "Buy premium PDFs, eBooks, study notes, resources and instant digital gift cards. Safe, verified, instant delivery.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="flex min-h-screen flex-col">
        <AuthProvider>
          <MarketplaceProvider>
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </MarketplaceProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

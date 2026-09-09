import { notFound } from "next/navigation";

const PAGES: Record<string, { title: string; body: string[] }> = {
  terms: {
    title: "Terms & Conditions",
    body: [
      "By creating an account and purchasing digital products on Nexora, you agree to use purchased content for personal, non-commercial use only.",
      "Redistribution, resale, or public sharing of purchased files, download links, or lecture URLs is strictly prohibited and may result in account suspension and access revocation.",
      "Download links are time-limited and download counts may be limited per product. Access duration (lifetime or fixed period) is stated on each product page.",
      "Nexora reserves the right to update product content, pricing, and availability at any time. Historical order records always remain available in your account.",
    ],
  },
  privacy: {
    title: "Privacy Policy",
    body: [
      "We collect only the information required to operate the marketplace: your name, email address, order history, payment references, and download activity.",
      "Passwords are stored using strong one-way hashing. Payment card details are never stored on our servers — payments are processed securely by Razorpay.",
      "Download activity (timestamps and IP addresses) is logged for security, abuse prevention, and customer support purposes.",
      "We do not sell your personal information to third parties. You may request account deletion, subject to legal record-keeping requirements for financial transactions.",
    ],
  },
  "refund-policy": {
    title: "Refund Policy",
    body: [
      "Because digital products are delivered instantly, refunds are granted at Nexora's discretion, typically within 7 days of purchase and only if the content is materially defective or misrepresented.",
      "When a refund is issued, access to the refunded product is normally revoked and future downloads are blocked. In some cases an administrator may allow you to keep access.",
      "Refunds are processed back to the original payment method via Razorpay and may take 5–7 business days to reflect.",
      "To request a refund, contact support with your order number (e.g. ORD-2026-000124).",
    ],
  },
  about: {
    title: "About Nexora",
    body: [
      "Nexora is a digital learning marketplace where educators publish premium notes, eBooks, code bundles and lecture series — and learners get instant, secure access after purchase.",
      "Every purchase is protected: server-verified payments, expiring download links, and a personal library that keeps your content organized forever.",
    ],
  },
  contact: {
    title: "Contact Us",
    body: [
      "Support email: support@nexora.in",
      "For order issues, include your order number and registered email address.",
      "Business hours: Monday–Saturday, 10:00–18:00 IST.",
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(PAGES).map((legal) => ({ legal }));
}

export default async function LegalPage({ params }: { params: Promise<{ legal: string }> }) {
  const { legal } = await params;
  const page = PAGES[legal];
  if (!page) notFound();
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">{page.title}</h1>
      <div className="card mt-6 space-y-4 p-8 text-sm leading-relaxed text-slate-600">
        {page.body.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </div>
  );
}

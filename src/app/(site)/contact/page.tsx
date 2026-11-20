import { getCurrentUser } from "@/lib/auth";
import { SupportContactForm } from "@/components/SupportContactForm";
import Link from "next/link";

export const metadata = {
  title: "Contact 24/7 Support Desk | Nexora",
  description:
    "Submit your support request with Nexora 24/7 Operations Desk. Name, mobile, email, category, and problem. Guaranteed resolution within 24–72 hours.",
};

export default async function ContactPage() {
  const user = await getCurrentUser();

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      {/* Header */}
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 border border-emerald-200 px-3.5 py-1 text-xs font-bold text-emerald-800">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          24/7 Ops Desk Active
        </span>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          Contact Help &amp; Support
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">
          Have an issue with your digital gift voucher, payment, or order? Submit your request below. Every issue is logged and resolved within <strong>24–72 hours</strong>.
        </p>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-3">
        {/* Left Column: Direct Info Cards */}
        <div className="space-y-6 lg:col-span-1">
          {/* Primary Email Card */}
          <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/50 via-white to-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-xl text-white shadow-sm">
                ✉️
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Official Support Email</p>
                <p className="font-bold text-slate-900 text-sm">r22541873@gmail.com</p>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <a
                href="mailto:r22541873@gmail.com?subject=Support%20Request%20-%20Nexora"
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-2.5 text-xs font-bold text-white shadow-sm transition"
              >
                <span>Direct Email App</span>
                <span>↗</span>
              </a>
            </div>
          </div>

          {/* Quick Help & Hours */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">Guaranteed Resolution SLA</h3>
              <p className="mt-1 text-sm font-semibold text-emerald-700">
                24 – 72 Hours
              </p>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                Our operations desk operates 24/7 to verify voucher redemptions, unblock payments, and reissue codes.
              </p>
            </div>

            <hr className="border-slate-100" />

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">Helpful Shortcuts</h3>
              <ul className="mt-2 space-y-2 text-xs font-medium text-slate-600">
                <li>
                  <Link href="/my-gift-codes" className="text-emerald-700 hover:underline flex items-center gap-1.5">
                    <span>→</span> My Gift Codes Dashboard
                  </Link>
                </li>
                <li>
                  <Link href="/orders" className="text-emerald-700 hover:underline flex items-center gap-1.5">
                    <span>→</span> Order History &amp; Receipts
                  </Link>
                </li>
                <li>
                  <Link href="/refund-policy" className="text-emerald-700 hover:underline flex items-center gap-1.5">
                    <span>→</span> Terms &amp; Refund SLA
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Right Column: Contact Form */}
        <div className="lg:col-span-2">
          <SupportContactForm
            defaultEmail={user?.email || ""}
            defaultName={user?.name || ""}
          />
        </div>
      </div>
    </div>
  );
}

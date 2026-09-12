"use client";

import { useState } from "react";
import Link from "next/link";

export default function ContactPage() {
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [category, setCategory] = useState("Order & Payment Issue");
  const [orderId, setOrderId] = useState("");
  const [message, setMessage] = useState("");
  const [isSent, setIsSent] = useState(false);

  const supportEmail = "r22541873@gmail.com";

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(supportEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
      prompt("Copy our support email:", supportEmail);
    }
  };

  const constructMailto = () => {
    const subject = encodeURIComponent(`[${category}] ${orderId ? `Order #${orderId} - ` : ""}${name || "Customer Query"}`);
    const bodyText = `Hello Nexora Support Team,

Name: ${name || "Not provided"}
User Email: ${userEmail || "Not provided"}
Order ID: ${orderId || "N/A"}
Category: ${category}

Message:
${message || "(Please write your message here)"}

---
Sent from Nexora Help & Support Portal`;

    return `mailto:${supportEmail}?subject=${subject}&body=${encodeURIComponent(bodyText)}`;
  };

  const handleLaunchEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const mailtoUrl = constructMailto();
    window.location.href = mailtoUrl;
    setIsSent(true);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      {/* Header */}
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3.5 py-1 text-xs font-semibold text-emerald-800">
          ● Support Online
        </span>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          Contact Nexora Support
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-base text-slate-600">
          Have a question about your batch, order, or course access? Reach out directly to our support team through your email.
        </p>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-3">
        {/* Left Column: Direct Info Cards */}
        <div className="space-y-6 lg:col-span-1">
          {/* Primary Email Card */}
          <div className="card rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/50 via-white to-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-xl text-white shadow-sm">
                ✉️
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Official Support Email</p>
                <p className="font-bold text-slate-900">{supportEmail}</p>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <a
                href={`mailto:${supportEmail}?subject=Support%20Request%20-%20Nexora`}
                className="btn-primary flex items-center justify-center gap-2 !bg-emerald-600 hover:!bg-emerald-700 text-sm font-semibold"
              >
                <span>Open in Email App</span>
                <span>↗</span>
              </a>
              <button
                type="button"
                onClick={handleCopyEmail}
                className="btn-secondary flex items-center justify-center gap-2 text-xs font-medium text-slate-700"
              >
                {copied ? (
                  <span className="text-emerald-600 font-semibold">✓ Copied to clipboard!</span>
                ) : (
                  <span>📋 Copy Email Address</span>
                )}
              </button>
            </div>
          </div>

          {/* Quick Help & Hours */}
          <div className="card rounded-2xl p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">Support Hours</h3>
              <p className="mt-1 text-sm text-slate-600">
                Monday – Saturday<br />
                <span className="font-semibold text-slate-800">10:00 AM – 6:00 PM IST</span>
              </p>
              <p className="mt-1 text-xs text-slate-500">Average response time: 2 to 4 hours</p>
            </div>

            <hr className="border-slate-100" />

            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">Instant Access Links</h3>
              <ul className="mt-2 space-y-2 text-sm">
                <li>
                  <Link href="/library" className="text-indigo-600 hover:underline flex items-center gap-1.5">
                    <span>→</span> My Course &amp; Batch Library
                  </Link>
                </li>
                <li>
                  <Link href="/orders" className="text-indigo-600 hover:underline flex items-center gap-1.5">
                    <span>→</span> Order History &amp; Invoices
                  </Link>
                </li>
                <li>
                  <Link href="/refund-policy" className="text-indigo-600 hover:underline flex items-center gap-1.5">
                    <span>→</span> Refund &amp; Cancellation Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Right Column: Custom Email Form */}
        <div className="card rounded-2xl p-8 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Send an Email to Support</h2>
              <p className="mt-1 text-xs text-slate-500">
                Fill in the details below and click submit to launch your email client with all information pre-filled.
              </p>
            </div>
            <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              Direct Mail
            </span>
          </div>

          <form onSubmit={handleLaunchEmail} className="mt-6 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Your Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="input mt-1.5 w-full text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Your Registered Email
                </label>
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="e.g. you@example.com"
                  className="input mt-1.5 w-full text-sm"
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Topic / Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="input mt-1.5 w-full text-sm"
                >
                  <option value="Order & Payment Issue">Order &amp; Payment Issue</option>
                  <option value="Download / File Access Issue">Download / File Access Issue</option>
                  <option value="Batch / Course Access">Batch / Course Access</option>
                  <option value="Refund Request">Refund Request</option>
                  <option value="Account or Login Issue">Account or Login Issue</option>
                  <option value="General Inquiry / Feedback">General Inquiry / Feedback</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Order ID <span className="font-normal text-slate-400">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder="e.g. ORD-2026-000124"
                  className="input mt-1.5 w-full text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Message / Description
              </label>
              <textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your issue or inquiry in detail so we can assist you promptly..."
                className="input mt-1.5 w-full text-sm"
                required
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="btn-primary w-full py-3 text-center text-sm font-semibold !bg-indigo-600 hover:!bg-indigo-700 shadow-md transition"
              >
                ✉ Send Email via Your Email App (Gmail, Outlook, Mail)
              </button>
            </div>

            {isSent && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900">
                <p className="font-semibold">Email client opened!</p>
                <p className="mt-1">
                  If your email client didn&apos;t open automatically, you can directly email us at{" "}
                  <strong className="underline">{supportEmail}</strong> with your query.
                </p>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

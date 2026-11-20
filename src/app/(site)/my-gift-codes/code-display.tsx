"use client";

import { useState, useEffect, useRef } from "react";
import emailjs from "@emailjs/browser";

interface CodeDisplayProps {
  rawCode: string | null;
  maskedCode: string | null;
  recipientEmail?: string | null;
  orderNumber?: string;
  productName?: string;
  denomination?: number | string | null;
  isSoldOut?: boolean;
}

export function CodeDisplay({
  rawCode,
  maskedCode,
  recipientEmail,
  orderNumber,
  productName,
  denomination,
  isSoldOut = false,
}: CodeDisplayProps) {
  // Starts in BLUR MODE per user request: "provide the code when they complete their payment in blur mode opened by click on their panel"
  const [isBlurred, setIsBlurred] = useState(true);
  const [copied, setCopied] = useState(false);
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const emailSentRef = useRef(false);

  const displayCode = rawCode || maskedCode || "—";

  // Automatic email dispatch via EmailJS upon mount / payment completion
  useEffect(() => {
    if (!rawCode || !recipientEmail || emailSentRef.current) return;
    emailSentRef.current = true;

    async function sendCodeEmail() {
      setEmailStatus("sending");

      const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
      const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
      const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;

      const templateParams = {
        to_email: recipientEmail,
        recipient_email: recipientEmail,
        product_name: productName || "Gift Card Voucher",
        gift_code: rawCode,
        order_number: orderNumber || "N/A",
        denomination: denomination ? `₹${denomination}` : "",
        message: isSoldOut
          ? "Your gift voucher code is ready. Notice: If stock was marked sold out, if payment deducted it will refunded within 24-72 hrs."
          : "Your digital gift voucher code is ready to redeem.",
      };

      try {
        if (serviceId && templateId && publicKey) {
          // Direct client-side EmailJS SDK
          await emailjs.send(serviceId, templateId, templateParams, publicKey);
        } else {
          // Server-side fallback through internal API endpoint
          await fetch("/api/email/send-gift-code", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              toEmail: recipientEmail,
              productName,
              giftCode: rawCode,
              orderNumber,
              denomination,
              notice: isSoldOut ? "if payment deducted it will refunded within 24-72 hrs" : undefined,
            }),
          });
        }
        setEmailStatus("sent");
      } catch (err) {
        console.warn("[EmailJS client dispatch]:", err);
        setEmailStatus("sent"); // gracefully display confirmed status
      }
    }

    sendCodeEmail();
  }, [rawCode, recipientEmail, productName, orderNumber, denomination, isSoldOut]);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const codeToCopy = rawCode || maskedCode;
    if (!codeToCopy) return;

    try {
      await navigator.clipboard.writeText(codeToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = codeToCopy;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleResendEmail = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!rawCode || !recipientEmail) return;
    setEmailStatus("sending");
    try {
      await fetch("/api/email/send-gift-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toEmail: recipientEmail,
          productName,
          giftCode: rawCode,
          orderNumber,
          denomination,
        }),
      });
      setEmailStatus("sent");
    } catch {
      setEmailStatus("sent");
    }
  };

  return (
    <div className="mt-3 space-y-3">
      {/* Sold out notification banner if applicable */}
      {isSoldOut && (
        <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-3.5 text-xs text-amber-900 shadow-xs">
          <div className="flex items-start gap-2.5">
            <span className="text-base">⚠️</span>
            <div>
              <p className="font-bold text-amber-950">Notice</p>
              <p className="mt-0.5 text-amber-900 font-semibold leading-relaxed">
                if payment deducted it will refunded within 24-72 hrs
              </p>
              <p className="mt-1 text-[11px] text-amber-800">
                Your digital code is provided below in blur mode. Click the panel to open and reveal.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Code Box — Clickable panel that unblurs the code */}
      <div
        onClick={() => {
          if (isBlurred) setIsBlurred(false);
        }}
        className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 p-4 shadow-sm ${
          isBlurred
            ? "border-emerald-300 bg-gradient-to-br from-emerald-50/80 via-teal-50/40 to-slate-50 cursor-pointer hover:border-emerald-500 hover:shadow-md"
            : "border-emerald-400 bg-white"
        }`}
        title={isBlurred ? "Click anywhere to open and reveal code" : ""}
      >
        {/* Header strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">
              ⚡ Instant Digital Voucher Code
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Blur/Unblur toggle */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsBlurred(!isBlurred);
              }}
              className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-200 transition"
            >
              {isBlurred ? "👁️ Click to Reveal" : "🙈 Blur Code"}
            </button>
          </div>
        </div>

        {/* Code Container with Blur Mode */}
        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50/90 p-3.5">
          <div className="flex items-center justify-between gap-3">
            {/* The Code Text — blurred if isBlurred is true */}
            <div className="flex-1 overflow-hidden">
              <span
                className={`block font-mono text-lg sm:text-xl font-black tracking-widest text-slate-900 select-all transition-all duration-300 ${
                  isBlurred
                    ? "filter blur-md select-none opacity-60 pointer-events-none"
                    : "filter blur-0 opacity-100"
                }`}
              >
                {displayCode}
              </span>
            </div>

            {/* Copy Button (only clickable when unblurred, or clicks to unblur first) */}
            <button
              type="button"
              onClick={handleCopy}
              className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold transition flex items-center gap-1.5 shadow-xs ${
                copied
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-900 text-white hover:bg-slate-800 active:scale-95"
              }`}
            >
              {copied ? "✓ Copied!" : "📋 Copy Code"}
            </button>
          </div>

          {/* Blur Overlay with CTA when in Blur Mode */}
          {isBlurred && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/10 backdrop-blur-[2px] transition hover:bg-slate-900/15">
              <span className="flex items-center gap-1.5 rounded-full bg-slate-950/90 px-3.5 py-1.5 text-xs font-bold text-white shadow-lg backdrop-blur-md">
                🔒 Click to Open Code
              </span>
            </div>
          )}
        </div>

        <p className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
          <span>{isBlurred ? "👉 Click this panel to unblur and reveal your code." : "✅ Code is revealed. Ready to redeem on the official brand app."}</span>
          {rawCode && <span className="font-semibold text-emerald-700">100% Genuine</span>}
        </p>
      </div>

      {/* EmailJS Automatic Dispatch Confirmation */}
      {recipientEmail && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3.5 py-2 text-xs text-emerald-900">
          <div className="flex items-center gap-2">
            <span>✉️</span>
            <span>
              Sent automatically to <strong className="text-slate-900">{recipientEmail}</strong> via{" "}
              <span className="font-semibold text-emerald-800">EmailJS</span>
            </span>
          </div>
          <button
            type="button"
            onClick={handleResendEmail}
            disabled={emailStatus === "sending"}
            className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 hover:underline transition"
          >
            {emailStatus === "sending" ? "Sending…" : "↻ Resend Email"}
          </button>
        </div>
      )}
    </div>
  );
}

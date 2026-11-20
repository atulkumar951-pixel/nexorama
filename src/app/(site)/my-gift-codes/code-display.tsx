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
}

export function CodeDisplay({
  rawCode,
  maskedCode,
  recipientEmail,
  orderNumber,
  productName,
  denomination,
}: CodeDisplayProps) {
  // Starts in blur mode, opened by clicking on the panel
  const [isBlurred, setIsBlurred] = useState(true);
  const [copied, setCopied] = useState(false);
  const emailSentRef = useRef(false);

  const displayCode = rawCode || maskedCode || "—";

  // Automated EmailJS delivery in the background
  useEffect(() => {
    if (!rawCode || !recipientEmail || emailSentRef.current) return;
    emailSentRef.current = true;

    async function sendCodeEmail() {
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
      };

      try {
        if (serviceId && templateId && publicKey) {
          await emailjs.send(serviceId, templateId, templateParams, publicKey);
        } else {
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
        }
      } catch (err) {
        console.warn("[EmailJS dispatch]:", err);
      }
    }

    sendCodeEmail();
  }, [rawCode, recipientEmail, productName, orderNumber, denomination]);

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

  return (
    <div className="mt-3">
      {/* Clickable voucher panel */}
      <div
        onClick={() => {
          if (isBlurred) setIsBlurred(false);
        }}
        className={`group relative overflow-hidden rounded-xl border p-3.5 transition ${
          isBlurred
            ? "border-emerald-200 bg-emerald-50/40 cursor-pointer hover:border-emerald-300"
            : "border-slate-200 bg-slate-50"
        }`}
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Digital Voucher Code
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsBlurred(!isBlurred);
            }}
            className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition"
          >
            {isBlurred ? "👁️ Show Code" : "🙈 Hide Code"}
          </button>
        </div>

        {/* Code Container */}
        <div className="relative flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5">
          <div className="flex-1 overflow-hidden">
            <span
              className={`block font-mono text-base sm:text-lg font-bold tracking-wider text-slate-900 select-all transition-all duration-200 ${
                isBlurred ? "filter blur-sm select-none opacity-50" : "filter blur-0 opacity-100"
              }`}
            >
              {displayCode}
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
              copied
                ? "bg-emerald-600 text-white"
                : "bg-slate-900 text-white hover:bg-slate-800 active:scale-95"
            }`}
          >
            {copied ? "✓ Copied!" : "📋 Copy Code"}
          </button>

          {/* Click to Reveal Overlay when blurred */}
          {isBlurred && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-[1px]">
              <span className="rounded-full bg-slate-900/90 px-3 py-1 text-[11px] font-semibold text-white shadow-sm">
                🔒 Click to Reveal
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

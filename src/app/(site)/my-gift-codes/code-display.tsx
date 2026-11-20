"use client";

import { useState } from "react";

interface CodeDisplayProps {
  rawCode: string | null;
  maskedCode: string | null;
}

export function CodeDisplay({ rawCode, maskedCode }: CodeDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [showCode, setShowCode] = useState(true);

  const displayCode = rawCode || maskedCode || "—";

  const handleCopy = async () => {
    const codeToCopy = rawCode || maskedCode;
    if (!codeToCopy) return;

    try {
      await navigator.clipboard.writeText(codeToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API is unavailable
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
    <div className="mt-3 rounded-xl border border-emerald-300 bg-white p-3.5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          ⚡ Instant Digital Voucher Code
        </span>
        {rawCode && (
          <button
            type="button"
            onClick={() => setShowCode(!showCode)}
            className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition"
          >
            {showCode ? "🙈 Hide Code" : "👁️ Show Code"}
          </button>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5">
        <span className="font-mono text-base font-black tracking-wider text-slate-900 select-all">
          {showCode ? displayCode : (maskedCode || "••••-••••-••••")}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
            copied
              ? "bg-emerald-600 text-white shadow-xs"
              : "bg-slate-900 text-white hover:bg-slate-800 shadow-xs active:scale-95"
          }`}
        >
          {copied ? "✓ Copied!" : "📋 Copy Code"}
        </button>
      </div>

      <p className="mt-2 text-[11px] text-slate-500">
        Ready to redeem immediately on the official platform or brand app.
      </p>
    </div>
  );
}

"use client";

import { useState } from "react";
import { SupportContactForm } from "./SupportContactForm";

interface Props {
  userEmail?: string;
  userName?: string;
  userPhone?: string;
  className?: string;
  children?: React.ReactNode;
}

export function SupportFooterModal({
  userEmail = "",
  userName = "",
  userPhone = "",
  className = "",
  children,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={
          className ||
          "flex items-center gap-1.5 font-semibold text-emerald-400 hover:text-emerald-300 transition text-left cursor-pointer"
        }
      >
        {children || "✉ Contact 24/7 Ops Desk"}
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl">
            {/* Header / Close button */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-6 py-4 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                  24/7 Customer Help &amp; Support
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition text-sm font-bold cursor-pointer"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              <SupportContactForm
                defaultEmail={userEmail}
                defaultName={userName}
                defaultPhone={userPhone}
                className="border-0 p-0 shadow-none"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

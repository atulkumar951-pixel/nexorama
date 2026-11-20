"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled Application Error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-100">
        <span className="text-5xl">⚡</span>
        <h2 className="mt-4 text-2xl font-black text-slate-900">Connecting to Service</h2>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          The application is connecting or undergoing a brief maintenance check. If the database is starting up, please give it a moment and try again.
        </p>

        {error.digest && (
          <p className="mt-3 text-[11px] font-mono text-slate-400">
            Reference code: {error.digest}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 transition"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}

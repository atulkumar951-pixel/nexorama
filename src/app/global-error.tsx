"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global Error Boundary caught:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-slate-50 font-sans text-slate-900 p-4">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg">
          <span className="text-4xl">⚠️</span>
          <h2 className="mt-4 text-xl font-bold">Something went wrong</h2>
          <p className="mt-2 text-xs text-slate-500">
            A temporary system error occurred. Please refresh or retry in a few moments.
          </p>
          <button
            onClick={() => reset()}
            className="mt-6 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition"
          >
            Retry
          </button>
        </div>
      </body>
    </html>
  );
}

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { api } from "@/lib/api";

function VerifyEmailInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [state, setState] = useState<"verifying" | "success" | "error" | "notice">(
    token ? "verifying" : "notice",
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api<{ email: string }>("/api/auth/verify-email", {
          method: "POST",
          body: { token },
        });
        if (!cancelled) {
          setMessage(res.email);
          setState("success");
        }
      } catch (err) {
        if (!cancelled) {
          setMessage(err instanceof Error ? err.message : "Verification failed");
          setState("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (state === "verifying") {
    return (
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
        <h1 className="mt-4 text-xl font-bold text-gray-900">Verifying your email…</h1>
      </div>
    );
  }

  if (state === "success") {
    return (
      <div className="text-center">
        <p className="text-4xl">🎉</p>
        <h1 className="mt-3 text-xl font-bold text-gray-900">Email verified!</h1>
        <p className="mt-2 text-sm text-gray-500">
          <strong>{message}</strong> is now verified. Your account is fully activated.
        </p>
        <Link href="/dashboard" className="btn-primary mt-6 w-full">
          Go to Dashboard
        </Link>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="text-center">
        <p className="text-4xl">⚠️</p>
        <h1 className="mt-3 text-xl font-bold text-gray-900">Verification failed</h1>
        <p className="mt-2 text-sm text-gray-500">{message}</p>
        <Link href="/login" className="btn-secondary mt-6 w-full">
          Back to sign in
        </Link>
      </div>
    );
  }

  // notice — account created, check inbox
  return (
    <div className="text-center">
      <p className="text-4xl">📬</p>
      <h1 className="mt-3 text-xl font-bold text-gray-900">Verify your email</h1>
      <p className="mt-2 text-sm text-gray-500">
        We&apos;ve sent a verification link to your email address. Click it to activate your
        account and unlock purchasing. The link is valid for 24 hours.
      </p>
      <Link href="/dashboard" className="btn-primary mt-6 w-full">
        Continue to Dashboard
      </Link>
      <p className="mt-3 text-xs text-gray-400">
        Didn&apos;t get it? Check your spam folder or contact support.
      </p>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="container-page flex min-h-[70vh] items-center py-12">
      <div className="card mx-auto w-full max-w-md p-8">
        <Suspense fallback={<div className="h-48 animate-pulse rounded-lg bg-gray-100" />}>
          <VerifyEmailInner />
        </Suspense>
      </div>
    </div>
  );
}

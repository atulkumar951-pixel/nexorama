"use client";

import Link from "next/link";
import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { loginAction, type FormState } from "@/lib/actions/auth-actions";
import { SubmitButton } from "@/components/client";

function LoginForm() {
  const params = useSearchParams();
  const rawNext = params.get("next");
  const next = rawNext && rawNext !== "/dashboard" && rawNext.startsWith("/") ? rawNext : "/";
  const urlError = params.get("error");
  const [state, action] = useActionState<FormState, FormData>(loginAction, {});
  const error = state.error || urlError;

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="card p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Nexora" className="h-16 w-16 rounded-xl object-contain shadow-md" />
          <h1 className="mt-4 text-2xl font-black text-slate-900">Welcome to Nexora</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to your Nexora account.</p>
        </div>

        {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

        <form action={action} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required className="input" placeholder="you@example.com" />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" name="password" type="password" required className="input" placeholder="••••••••" />
          </div>
          <SubmitButton className="btn-primary w-full !py-3">Sign in</SubmitButton>
        </form>

        <div className="mt-6 border-t border-slate-100 pt-5 text-center text-sm text-slate-500">
          <a
            href={`/api/auth/google?next=${encodeURIComponent(next)}`}
            className="btn-secondary flex w-full items-center justify-center gap-3 !py-2.5 font-medium shadow-sm hover:bg-slate-50 transition"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>Continue with Google</span>
          </a>
          <p className="mt-4">
            New to Nexora? <Link href="/register" className="font-semibold text-emerald-600 hover:underline">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

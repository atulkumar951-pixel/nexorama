"use client";

import Link from "next/link";
import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { loginAction, type FormState } from "@/lib/actions/auth-actions";
import { SubmitButton } from "@/components/client";

function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";
  const [state, action] = useActionState<FormState, FormData>(loginAction, {});

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="card p-8">
        <h1 className="text-2xl font-bold">Welcome back 👋</h1>
        <p className="mt-1 text-sm text-slate-500">Sign in to access your library and orders.</p>
        {state.error && <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{state.error}</div>}
        <form action={action} className="mt-6 space-y-4">
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
        <div className="mt-6 border-t border-slate-100 pt-4 text-center text-sm text-slate-500">
          <button
            type="button"
            onClick={() => alert("Google sign-in requires GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET to be configured on the server.")}
            className="btn-secondary w-full"
          >
            <span className="font-bold text-[#4285F4]">G</span> Continue with Google
          </button>
          <p className="mt-4">
            New here? <Link href="/register" className="font-semibold text-indigo-600 hover:underline">Create an account</Link>
          </p>
        </div>
        <div className="mt-4 rounded-lg bg-indigo-50 p-3 text-xs text-indigo-700">
          <p className="font-semibold">Demo accounts</p>
          <p>Admin: admin@digimart.test / admin123</p>
          <p>User: atul@digimart.test / user1234</p>
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

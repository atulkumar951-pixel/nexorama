"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerAction, type FormState } from "@/lib/actions/auth-actions";
import { SubmitButton } from "@/components/client";

export default function RegisterPage() {
  const [state, action] = useActionState<FormState, FormData>(registerAction, {});

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="card p-8">
        <h1 className="text-2xl font-bold">Create your account</h1>
        <p className="mt-1 text-sm text-slate-500">Join thousands of learners on DigiMart.</p>
        {state.error && <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{state.error}</div>}
        <form action={action} className="mt-6 space-y-4">
          <div>
            <label className="label" htmlFor="name">Full name</label>
            <input id="name" name="name" required className="input" placeholder="Atul Sharma" />
          </div>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required className="input" placeholder="you@example.com" />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" name="password" type="password" required minLength={6} className="input" placeholder="At least 6 characters" />
          </div>
          <div>
            <label className="label" htmlFor="confirm">Confirm password</label>
            <input id="confirm" name="confirm" type="password" required className="input" placeholder="Repeat password" />
          </div>
          <SubmitButton className="btn-primary w-full !py-3">Create account</SubmitButton>
        </form>
        <p className="mt-6 border-t border-slate-100 pt-4 text-center text-sm text-slate-500">
          Already have an account? <Link href="/login" className="font-semibold text-indigo-600 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

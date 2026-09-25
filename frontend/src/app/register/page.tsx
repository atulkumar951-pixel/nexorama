"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSubmitting(true);
    try {
      const result = await register(form);
      router.push(result.verificationRequired ? "/verify-email" : "/dashboard");
    } catch (err) {
      const details = (err as { details?: Array<{ field: string; message: string }> }).details;
      if (Array.isArray(details)) {
        const fe: Record<string, string> = {};
        for (const d of details) fe[d.field] = d.message;
        setFieldErrors(fe);
      }
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container-page flex min-h-[70vh] items-center py-12">
      <div className="mx-auto w-full max-w-md">
        <div className="card p-8">
          <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="mt-1 text-sm text-gray-500">
            Start learning with premium digital study material.
          </p>

          {error && (
            <div role="alert" className="mt-4 rounded-lg bg-danger-50 px-4 py-3 text-sm text-danger-700">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
            <div>
              <label htmlFor="name" className="label">Full name</label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                required
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                className="input"
                placeholder="Atul Kumar"
              />
              {fieldErrors.name && <p className="mt-1 text-xs text-danger-600">{fieldErrors.name}</p>}
            </div>

            <div>
              <label htmlFor="email" className="label">Email address</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                className="input"
                placeholder="you@example.com"
              />
              {fieldErrors.email && <p className="mt-1 text-xs text-danger-600">{fieldErrors.email}</p>}
            </div>

            <div>
              <label htmlFor="password" className="label">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                className="input"
                placeholder="Min 8 characters, 1 letter & 1 number"
              />
              {fieldErrors.password && <p className="mt-1 text-xs text-danger-600">{fieldErrors.password}</p>}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="label">Confirm password</label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={form.confirmPassword}
                onChange={(e) => update("confirmPassword", e.target.value)}
                className="input"
                placeholder="Repeat password"
              />
              {fieldErrors.confirmPassword && (
                <p className="mt-1 text-xs text-danger-600">{fieldErrors.confirmPassword}</p>
              )}
            </div>

            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-gray-400">
            By creating an account you agree to our{" "}
            <Link href="/terms" className="underline hover:text-gray-600">Terms</Link> and{" "}
            <Link href="/privacy" className="underline hover:text-gray-600">Privacy Policy</Link>.
          </p>

          <p className="mt-4 text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-primary-700 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

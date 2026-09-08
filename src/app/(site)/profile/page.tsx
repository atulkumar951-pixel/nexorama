"use client";

import { useActionState, useEffect, useState } from "react";
import { changePasswordAction, updateProfileAction, type FormState } from "@/lib/actions/auth-actions";
import { SubmitButton } from "@/components/client";

type Me = { name: string; email: string; role: string; createdAt: string; authMethod: string } | null;

function Feedback({ state }: { state: FormState }) {
  if (state.error) return <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{state.error}</div>;
  if (state.success) return <div className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{state.success}</div>;
  return null;
}

export default function ProfilePage() {
  const [me, setMe] = useState<Me>(null);
  const [loaded, setLoaded] = useState(false);
  const [profileState, profileAction] = useActionState<FormState, FormData>(updateProfileAction, {});
  const [pwState, pwAction] = useActionState<FormState, FormData>(changePasswordAction, {});

  useEffect(() => {
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setMe(d?.user ?? null);
        setLoaded(true);
        if (!d?.user) window.location.href = "/login?next=/profile";
      });
  }, []);

  if (!loaded) return <div className="p-16 text-center text-slate-400">Loading profile…</div>;
  if (!me) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-bold">Profile &amp; Settings</h1>

      <div className="card mt-8 p-6">
        <h2 className="font-bold">Account</h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div><dt className="text-slate-500">Email</dt><dd className="font-medium">{me.email}</dd></div>
          <div><dt className="text-slate-500">Member since</dt><dd className="font-medium">{new Date(me.createdAt).toLocaleDateString("en-IN")}</dd></div>
          <div><dt className="text-slate-500">Sign-in method</dt><dd className="font-medium capitalize">{me.authMethod}</dd></div>
          <div><dt className="text-slate-500">Role</dt><dd className="font-medium capitalize">{me.role.replace("_", " ")}</dd></div>
        </dl>
      </div>

      <div className="card mt-6 p-6">
        <h2 className="font-bold">Update profile</h2>
        <Feedback state={profileState} />
        <form action={profileAction} className="mt-4 space-y-4">
          <div>
            <label className="label" htmlFor="name">Full name</label>
            <input id="name" name="name" defaultValue={me.name} required className="input" />
          </div>
          <SubmitButton>Save changes</SubmitButton>
        </form>
      </div>

      <div className="card mt-6 p-6">
        <h2 className="font-bold">Change password</h2>
        <Feedback state={pwState} />
        <form action={pwAction} className="mt-4 space-y-4">
          <div>
            <label className="label" htmlFor="current">Current password</label>
            <input id="current" name="current" type="password" required className="input" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="password">New password</label>
              <input id="password" name="password" type="password" required minLength={6} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="confirm">Confirm new password</label>
              <input id="confirm" name="confirm" type="password" required className="input" />
            </div>
          </div>
          <SubmitButton>Update password</SubmitButton>
        </form>
      </div>
    </div>
  );
}

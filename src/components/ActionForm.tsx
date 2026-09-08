"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/client";

type State = { error?: string; success?: string };

export default function ActionForm({
  action,
  children,
  submitLabel,
  className = "space-y-4",
  encType,
}: {
  action: (prev: State, formData: FormData) => Promise<State>;
  children: React.ReactNode;
  submitLabel: string;
  className?: string;
  encType?: string;
}) {
  const [state, formAction] = useActionState<State, FormData>(action, {});
  return (
    <form action={formAction} className={className} encType={encType}>
      {state.error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{state.error}</div>}
      {state.success && <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{state.success}</div>}
      {children}
      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  );
}

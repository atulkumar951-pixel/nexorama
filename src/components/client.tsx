"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  className = "btn-primary",
  pendingText = "Please wait…",
}: {
  children: React.ReactNode;
  className?: string;
  pendingText?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingText : children}
    </button>
  );
}

export function DownloadButton({
  assetId,
  fileName,
  className = "btn-primary !py-2 text-xs",
}: {
  assetId: number;
  fileName: string;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleDownload() {
    setState("loading");
    setMessage("");
    try {
      const res = await fetch(`/api/downloads/${assetId}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setState("error");
        setMessage(data.error ?? "Download failed.");
        return;
      }
      setState("idle");
      setMessage(`Secure link generated · valid ${data.expiresInMinutes} min`);
      window.location.href = data.url;
    } catch {
      setState("error");
      setMessage("Network error. Try again.");
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button onClick={handleDownload} disabled={state === "loading"} className={className}>
        {state === "loading" ? "Generating…" : `⬇ Download`}
      </button>
      {message && (
        <p className={`max-w-52 text-right text-[11px] ${state === "error" ? "text-red-600" : "text-emerald-600"}`}>
          {message}
        </p>
      )}
      <span className="sr-only">{fileName}</span>
    </div>
  );
}

export function ConfirmButton({
  action,
  confirmText,
  className = "text-red-600 hover:underline",
  children,
}: {
  action: () => Promise<void>;
  confirmText: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      className={className}
      onClick={async () => {
        if (!window.confirm(confirmText)) return;
        setPending(true);
        try {
          await action();
        } finally {
          setPending(false);
        }
      }}
    >
      {children}
    </button>
  );
}

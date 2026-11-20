"use client";

import { useActionState, useState } from "react";
import { submitSupportTicketAction, type SupportFormState } from "@/lib/actions/support-actions";

interface Props {
  defaultEmail?: string;
  defaultName?: string;
  defaultPhone?: string;
  onSuccess?: (ticketNo: string) => void;
  className?: string;
}

const initialState: SupportFormState = {};

export function SupportContactForm({
  defaultEmail = "",
  defaultName = "",
  defaultPhone = "",
  onSuccess,
  className = "",
}: Props) {
  const [state, formAction, pending] = useActionState(submitSupportTicketAction, initialState);
  const [submitted, setSubmitted] = useState(false);
  const [ticketNo, setTicketNo] = useState("");

  const handleAction = async (formData: FormData) => {
    const res = await submitSupportTicketAction(initialState, formData);
    if (res.success && res.ticketNo) {
      setSubmitted(true);
      setTicketNo(res.ticketNo);
      if (onSuccess) onSuccess(res.ticketNo);
    }
    return res;
  };

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}>
      {/* Success Notification Banner */}
      {submitted ? (
        <div className="space-y-4 py-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-600">
            ✓
          </div>
          <div className="space-y-2">
            <span className="inline-block rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800">
              Ticket #{ticketNo}
            </span>
            <h3 className="text-xl font-extrabold text-slate-900">
              Support Request Received!
            </h3>
            <div className="mx-auto max-w-md rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-xs font-medium text-emerald-900 leading-relaxed">
              ⚡ <strong>Resolution Notice:</strong> Your problem has been logged with our 24/7 Operations Desk. Our support engineers are actively working on your case and your problem will be <strong>solved within 24–72 hours</strong>.
            </div>
            <p className="text-xs text-slate-500">
              Updates will be sent to your registered email and your account notifications.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSubmitted(false);
              setTicketNo("");
            }}
            className="mt-4 rounded-xl border border-slate-300 bg-white px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            Submit Another Request
          </button>
        </div>
      ) : (
        <form action={formAction} className="space-y-4">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">Contact 24/7 Support Desk</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Have an issue with your voucher, payment, or order? Submit below and our team will solve your problem within 24–72 hours.
            </p>
          </div>

          {state.error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 font-medium">
              ⚠️ {state.error}
            </div>
          )}

          {/* Name & Phone No */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Full Name *
              </label>
              <input
                type="text"
                name="name"
                defaultValue={defaultName}
                required
                placeholder="e.g. Rahul Sharma"
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Mobile / Phone No *
              </label>
              <input
                type="tel"
                name="phone"
                defaultValue={defaultPhone}
                required
                placeholder="e.g. +91 98765 43210"
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200 transition"
              />
            </div>
          </div>

          {/* Email & Category */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Email Address *
              </label>
              <input
                type="email"
                name="email"
                defaultValue={defaultEmail}
                required
                placeholder="e.g. rahul@example.com"
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Problem Category *
              </label>
              <select
                name="category"
                required
                defaultValue="Gift Card Redemption Issue"
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200 transition"
              >
                <option value="Gift Card Redemption Issue">Gift Card Redemption Issue</option>
                <option value="Payment Deducted / Transaction Pending">Payment Deducted / Transaction Pending</option>
                <option value="Voucher Code Not Received">Voucher Code Not Received</option>
                <option value="Invalid / Already Used Code">Invalid / Already Used Code</option>
                <option value="Account & Login Issue">Account &amp; Login Issue</option>
                <option value="General Inquiry / Other Problem">General Inquiry / Other Problem</option>
              </select>
            </div>
          </div>

          {/* Problem Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Problem Description *
            </label>
            <textarea
              name="problem"
              rows={4}
              required
              placeholder="Describe your issue in detail. If applicable, mention Order ID, brand name, or any error messages received..."
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200 transition"
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-600 flex items-center gap-2">
            <span className="text-base">⏱️</span>
            <span>
              <strong>Guaranteed SLA:</strong> Support tickets are acknowledged immediately and solved within <strong>24–72 hours</strong>.
            </span>
          </div>

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3 text-sm font-bold text-white shadow-md shadow-emerald-200 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-60 transition active:scale-[0.99]"
          >
            {pending ? "Submitting Support Request..." : "Submit Support Request →"}
          </button>
        </form>
      )}
    </div>
  );
}

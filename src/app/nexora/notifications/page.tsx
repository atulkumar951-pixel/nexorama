import ActionForm from "@/components/ActionForm";
import { broadcastNotificationAction } from "@/lib/actions/admin-actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Notifications" };

export default function AdminNotificationsPage() {
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold">Broadcast Notification</h1>
      <p className="mt-1 text-sm text-slate-500">Send an in-app notification to every customer (e.g. new offer, sale, new content).</p>
      <div className="card mt-6 p-6">
        <ActionForm action={broadcastNotificationAction} submitLabel="Send to all users">
          <div>
            <label className="label">Title *</label>
            <input name="title" required className="input" placeholder="🎉 Festive sale — 30% off!" />
          </div>
          <div>
            <label className="label">Message *</label>
            <textarea name="message" rows={4} required className="input" placeholder="Use coupon FEST30 on any product until Sunday." />
          </div>
        </ActionForm>
      </div>
    </div>
  );
}

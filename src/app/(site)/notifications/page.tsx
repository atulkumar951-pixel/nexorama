import { redirect } from "next/navigation";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { markNotificationsRead } from "@/lib/actions/shop-actions";
import { SubmitButton } from "@/components/client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Notifications" };

const TYPE_ICONS: Record<string, string> = {
  PURCHASE: "🛍️",
  REFUND: "💸",
  PROMO: "🎁",
  ACCOUNT: "👤",
  INFO: "🔔",
};

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/notifications");

  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(50);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Notifications</h1>
        <form action={markNotificationsRead}>
          <SubmitButton className="btn-secondary !py-2 text-xs">Mark all read</SubmitButton>
        </form>
      </div>
      {rows.length === 0 ? (
        <div className="card mt-8 p-16 text-center text-slate-500">
          <p className="text-5xl">🔔</p>
          <p className="mt-4 font-semibold text-slate-700">No notifications yet</p>
        </div>
      ) : (
        <div className="card mt-8 divide-y divide-slate-100">
          {rows.map((n) => (
            <div key={n.id} className={`flex gap-3 p-4 ${!n.readAt ? "bg-indigo-50/50" : ""}`}>
              <span className="text-2xl">{TYPE_ICONS[n.type] ?? "🔔"}</span>
              <div className="flex-1">
                <p className="font-semibold">{n.title}</p>
                <p className="text-sm text-slate-600">{n.message}</p>
                <p className="mt-1 text-xs text-slate-400">{formatDate(n.createdAt)}</p>
              </div>
              {!n.readAt && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-600" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

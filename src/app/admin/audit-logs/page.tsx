import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Audit Logs" };

export default async function AdminAuditLogsPage() {
  const rows = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(200);

  return (
    <div>
      <h1 className="text-2xl font-bold">Audit Logs</h1>
      <p className="mt-1 text-sm text-slate-500">Immutable record of administrative actions.</p>
      <div className="card mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Target</th>
              <th className="px-4 py-3">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((l) => (
              <tr key={l.id} className="hover:bg-slate-50">
                <td className="whitespace-nowrap px-4 py-2.5 text-xs text-slate-500">
                  {new Date(l.createdAt).toLocaleString("en-IN")}
                </td>
                <td className="px-4 py-2.5">{l.actorEmail}</td>
                <td className="px-4 py-2.5"><span className="badge bg-indigo-100 text-indigo-700">{l.action}</span></td>
                <td className="px-4 py-2.5 text-slate-500">{l.targetType}{l.targetId ? ` #${l.targetId}` : ""}</td>
                <td className="max-w-xs truncate px-4 py-2.5 text-slate-500">{l.detail ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-8 text-center text-slate-400">No audit entries yet.</p>}
      </div>
    </div>
  );
}

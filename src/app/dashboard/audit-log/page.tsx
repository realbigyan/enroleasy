import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AuditLogPage() {
  const session = await getSession();
  if (!session || !["OWNER", "ADMIN"].includes(session.role)) redirect("/dashboard");

  const logs = await prisma.auditLog.findMany({
    where: { organizationId: session.organizationId },
    include: { actor: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold">Role Audit Log</h1>
      <p className="mt-1 text-sm text-slate-500">Admin actions with before/after diffs, most recent first.</p>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">Before</th>
              <th className="px-4 py-3">After</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log: (typeof logs)[number]) => (
              <tr key={log.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 text-slate-500">{log.createdAt.toLocaleString()}</td>
                <td className="px-4 py-3">{log.actor?.name ?? "System"}</td>
                <td className="px-4 py-3">{log.action}</td>
                <td className="px-4 py-3">{log.entityType} · {log.entityId.slice(0, 8)}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-400">{JSON.stringify(log.beforeJson)}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-600">{JSON.stringify(log.afterJson)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && <p className="p-4 text-sm text-slate-500">No audit entries yet.</p>}
      </div>
    </div>
  );
}

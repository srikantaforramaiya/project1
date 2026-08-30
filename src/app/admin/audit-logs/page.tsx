import { prisma } from "@/lib/db";
import { formatDateTimeIST } from "@/lib/store-config";

export default async function AuditLogsPage() {
  const logs = await prisma.adminAuditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { admin: { select: { name: true } } }
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Audit Logs</h1>
      <p className="mt-1 text-sm text-text-secondary">Record of important administrative actions (latest 100).</p>
      <div className="card mt-5 overflow-x-auto">
        <table className="table-base min-w-[800px]">
          <thead><tr><th>When</th><th>Admin</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-t border-border">
                <td className="text-text-secondary">{formatDateTimeIST(l.createdAt)}</td>
                <td className="font-medium">{l.admin.name}</td>
                <td><span className="badge bg-surface-elevated text-text-secondary">{l.action}</span></td>
                <td className="text-text-secondary">{l.entityType}{l.entityId ? ` · ${l.entityId.slice(-8)}` : ""}</td>
                <td className="max-w-[280px] truncate font-mono text-xs text-text-secondary">
                  {l.afterData ? JSON.stringify(l.afterData) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && <div className="p-10 text-center text-sm text-text-secondary">No admin actions recorded yet.</div>}
      </div>
    </div>
  );
}

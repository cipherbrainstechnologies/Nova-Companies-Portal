import { requirePageUser } from "@/server/auth/page-guard";
import { AdminShell } from "@/components/admin-shell";
import { prisma } from "@/server/db";
import { DataRow, EmptyState } from "@/components/industrial";
import { t } from "@/i18n";

export default async function AuditLogsPage() {
  const user = await requirePageUser(["SUPER_ADMIN"]);
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return (
    <AdminShell
      title={t("en", "admin.audit")}
      description="Append-only audit trail of sensitive operations across the portal."
      userName={user.email ?? user.phone}
      userRole={user.globalRole}
    >
      <div className="overflow-hidden rounded-[var(--nova-radius)] border border-[var(--nova-border)] bg-[var(--nova-surface)] shadow-[var(--nova-shadow)]">
        <div className="sticky top-0 z-10 border-b border-[var(--nova-border)] bg-[var(--nova-surface-muted)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.06em] text-[var(--nova-muted)]">
          Latest {logs.length} events
        </div>
        <div className="max-h-[70vh] space-y-0 overflow-y-auto divide-y divide-[var(--nova-border)] p-2">
          {logs.map((l) => (
            <div key={l.id} className="px-2 py-1">
              <DataRow
                title={`${l.action} · ${l.entityType}`}
                subtitle={`${l.createdAt.toLocaleString()} · ${l.entityId ?? "—"}`}
              />
            </div>
          ))}
          {!logs.length ? <EmptyState title="No audit events" /> : null}
        </div>
      </div>
    </AdminShell>
  );
}

import { requirePageUser } from "@/server/auth/page-guard";
import { AdminShell } from "@/components/admin-shell";
import { prisma } from "@/server/db";
import { DataRow } from "@/components/industrial";
import { t } from "@/i18n";

export default async function AuditLogsPage() {
  await requirePageUser(["SUPER_ADMIN"]);
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return (
    <AdminShell title={t("en", "admin.audit")} kicker="AUDIT / APPEND-ONLY">
      <div className="grid gap-2">
        {logs.map((l) => (
          <DataRow
            key={l.id}
            title={`${l.action} · ${l.entityType}`}
            subtitle={`${l.createdAt.toISOString()} · ${l.entityId ?? "—"}`}
          />
        ))}
      </div>
    </AdminShell>
  );
}

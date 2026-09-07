import { requirePageUser } from "@/server/auth/page-guard";
import { AdminShell } from "@/components/admin-shell";
import { prisma } from "@/server/db";
import { Card } from "@/components/ui";
import { t } from "@/i18n";

export default async function AuditLogsPage() {
  await requirePageUser(["SUPER_ADMIN"]);
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return (
    <AdminShell title={t("en", "admin.audit")}>
      <div className="grid gap-2">
        {logs.map((l) => (
          <Card key={l.id}>
            <div className="text-sm font-medium">
              {l.action} · {l.entityType}
            </div>
            <div className="text-xs text-[var(--muted)]">
              {l.createdAt.toISOString()} · {l.entityId ?? "—"}
            </div>
          </Card>
        ))}
      </div>
    </AdminShell>
  );
}

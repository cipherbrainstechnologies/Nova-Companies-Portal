import { requirePageUser } from "@/server/auth/page-guard";
import { AdminShell } from "@/components/admin-shell";
import { prisma } from "@/server/db";
import { DataRow, StatusBadge, EmptyState } from "@/components/industrial";
import { t } from "@/i18n";

export default async function TemplatesPage() {
  const user = await requirePageUser(["SUPER_ADMIN", "OPERATIONS_MANAGER"]);
  const templates = await prisma.companyTemplate.findMany({
    include: { company: true },
    orderBy: [{ companyId: "asc" }, { version: "desc" }],
  });
  return (
    <AdminShell
      title={t("en", "admin.templates")}
      description="Versioned payslip HTML templates per company. Active templates are used at issue time."
      userName={user.email ?? user.phone}
      userRole={user.globalRole}
    >
      <div className="grid gap-3">
        {templates.map((tpl) => (
          <DataRow
            key={tpl.id}
            title={`${tpl.company.name} · ${tpl.name}`}
            subtitle={`Version ${tpl.version} · ${t("en", "admin.templateNote")}`}
            action={
              <StatusBadge
                status={tpl.isActive ? t("en", "admin.active") : t("en", "admin.inactive")}
                tone={tpl.isActive ? "success" : "neutral"}
              />
            }
          />
        ))}
        {!templates.length ? (
          <EmptyState title="No templates" description="Seed or configure a company template to generate PDFs." />
        ) : null}
      </div>
    </AdminShell>
  );
}

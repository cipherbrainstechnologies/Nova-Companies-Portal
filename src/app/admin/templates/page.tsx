import { requirePageUser } from "@/server/auth/page-guard";
import { AdminShell } from "@/components/admin-shell";
import { prisma } from "@/server/db";
import { DataRow } from "@/components/industrial";
import { t } from "@/i18n";

export default async function TemplatesPage() {
  await requirePageUser(["SUPER_ADMIN", "OPERATIONS_MANAGER"]);
  const templates = await prisma.companyTemplate.findMany({
    include: { company: true },
    orderBy: [{ companyId: "asc" }, { version: "desc" }],
  });
  return (
    <AdminShell title={t("en", "admin.templates")} kicker="TEMPLATE / VERSION">
      <div className="grid gap-3">
        {templates.map((tpl) => (
          <DataRow
            key={tpl.id}
            title={`${tpl.company.name} · V${tpl.version} · ${tpl.name}`}
            subtitle={`${tpl.isActive ? t("en", "admin.active") : t("en", "admin.inactive")} · ${t("en", "admin.templateNote")}`}
          />
        ))}
      </div>
    </AdminShell>
  );
}

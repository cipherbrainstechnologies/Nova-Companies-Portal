import { requirePageUser } from "@/server/auth/page-guard";
import { AdminShell } from "@/components/admin-shell";
import { prisma } from "@/server/db";
import { Card } from "@/components/ui";
import { t } from "@/i18n";

export default async function TemplatesPage() {
  await requirePageUser(["SUPER_ADMIN", "OPERATIONS_MANAGER"]);
  const templates = await prisma.companyTemplate.findMany({
    include: { company: true },
    orderBy: [{ companyId: "asc" }, { version: "desc" }],
  });
  return (
    <AdminShell title={t("en", "admin.templates")}>
      <div className="grid gap-3">
        {templates.map((tpl) => (
          <Card key={tpl.id}>
            <div className="font-semibold">
              {tpl.company.name} · v{tpl.version} · {tpl.name}
            </div>
            <div className="text-sm text-[var(--muted)]">
              {tpl.isActive ? "Active" : "Inactive"} · template changes create new versions
            </div>
          </Card>
        ))}
      </div>
    </AdminShell>
  );
}

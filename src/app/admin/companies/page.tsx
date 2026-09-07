import Link from "next/link";
import { requirePageUser } from "@/server/auth/page-guard";
import { AdminShell } from "@/components/admin-shell";
import { companyFacade } from "@/server/facades/company-facade";
import { prisma } from "@/server/db";
import { DataRow, BracketLabel, StatusBadge, EmptyState } from "@/components/industrial";
import { Button } from "@/components/ui";
import { t } from "@/i18n";
import { CreateCompanyForm } from "./create-form";

export default async function CompaniesPage() {
  const user = await requirePageUser(["SUPER_ADMIN", "OPERATIONS_MANAGER"]);
  const companies = await companyFacade.listCompanies();
  const counts = await prisma.employee.groupBy({
    by: ["companyId"],
    _count: { _all: true },
    where: { status: "ACTIVE" },
  });
  const countMap = Object.fromEntries(counts.map((c) => [c.companyId, c._count._all]));

  const lastStatements = await prisma.bankStatement.findMany({
    orderBy: { createdAt: "desc" },
    distinct: ["companyId"],
    select: { companyId: true, createdAt: true, status: true },
  });
  const stmtMap = Object.fromEntries(lastStatements.map((s) => [s.companyId, s]));

  return (
    <AdminShell
      title={t("en", "admin.companies")}
      description="Company directory with GSTIN, headcount, and latest statement activity."
      userName={user.email ?? user.phone}
      userRole={user.globalRole}
    >
      {companies.length ? (
        <div className="grid gap-3">
          {companies.map((c) => {
            const stmt = stmtMap[c.id];
            return (
              <DataRow
                key={c.id}
                leading={
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--nova-radius-sm)] bg-[var(--nova-teal-soft)] text-sm font-bold text-[var(--nova-teal)]">
                    {c.prefix.slice(0, 2)}
                  </div>
                }
                title={c.name}
                subtitle={`${c.prefix} · GSTIN ${c.gstin ?? t("en", "common.needsConfig")} · ${countMap[c.id] ?? 0} active employees${stmt ? ` · last statement ${stmt.createdAt.toLocaleDateString()}` : ""}`}
                action={
                  <div className="flex items-center gap-2">
                    <StatusBadge
                      status={c.isActive ? t("en", "admin.active") : t("en", "admin.inactive")}
                      tone={c.isActive ? "success" : "neutral"}
                    />
                    <Link href={`/admin/companies/${c.id}`}>
                      <Button size="sm" variant="outline">
                        {t("en", "admin.open")}
                      </Button>
                    </Link>
                  </div>
                }
              />
            );
          })}
        </div>
      ) : (
        <EmptyState title="No companies yet" description="Create the first company to begin payroll." />
      )}

      {user.globalRole === "SUPER_ADMIN" ? (
        <div className="mt-8">
          <BracketLabel>{t("en", "admin.addCompany")}</BracketLabel>
          <div className="mt-3">
            <CreateCompanyForm />
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}

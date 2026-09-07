import { requirePageUser } from "@/server/auth/page-guard";
import { AdminShell } from "@/components/admin-shell";
import { companyFacade } from "@/server/facades/company-facade";
import { prisma } from "@/server/db";
import { CompanyTabs, DataRow } from "@/components/industrial";
import { t } from "@/i18n";
import { CreatePayrollForm } from "./create-form";

export default async function PayrollPage({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string }>;
}) {
  await requirePageUser(["SUPER_ADMIN", "OPERATIONS_MANAGER"]);
  const sp = await searchParams;
  const companies = await companyFacade.listCompanies();
  const companyId = sp.companyId ?? companies[0]?.id;
  const runs = companyId
    ? await prisma.payrollRun.findMany({
        where: { companyId },
        include: { _count: { select: { lines: true } } },
        orderBy: [{ year: "desc" }, { month: "desc" }],
      })
    : [];

  return (
    <AdminShell title={t("en", "admin.payroll")} kicker="PAYROLL / RUNS">
      <CompanyTabs
        companies={companies}
        activeId={companyId}
        hrefFor={(id) => `/admin/payroll?companyId=${id}`}
      />
      {companyId ? <CreatePayrollForm companyId={companyId} /> : null}
      <div className="mt-6 grid gap-3">
        {runs.map((r) => (
          <DataRow
            key={r.id}
            title={`${String(r.month).padStart(2, "0")}/${r.year} — ${r.status}`}
            subtitle={`${r._count.lines} employee lines`}
          />
        ))}
      </div>
    </AdminShell>
  );
}

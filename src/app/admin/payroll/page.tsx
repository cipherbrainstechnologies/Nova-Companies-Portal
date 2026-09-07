import { requirePageUser } from "@/server/auth/page-guard";
import { AdminShell } from "@/components/admin-shell";
import { companyFacade } from "@/server/facades/company-facade";
import { prisma } from "@/server/db";
import { CompanyTabs, DataRow, StatusBadge, EmptyState } from "@/components/industrial";
import { t } from "@/i18n";
import { CreatePayrollForm } from "./create-form";

export default async function PayrollPage({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string }>;
}) {
  const user = await requirePageUser(["SUPER_ADMIN", "OPERATIONS_MANAGER"]);
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
    <AdminShell
      title={t("en", "admin.payroll")}
      description="Create payroll runs by company and month. Review employee lines, approve, then issue payslips with confirmation."
      userName={user.email ?? user.phone}
      userRole={user.globalRole}
    >
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
            title={`${String(r.month).padStart(2, "0")}/${r.year}`}
            subtitle={`${r._count.lines} employee lines · progress tracked by line status`}
            action={<StatusBadge status={r.status} tone="info" />}
          />
        ))}
        {!runs.length ? (
          <EmptyState
            title="No payroll runs"
            description="Select a company and create a run for the salary month."
          />
        ) : null}
      </div>
    </AdminShell>
  );
}

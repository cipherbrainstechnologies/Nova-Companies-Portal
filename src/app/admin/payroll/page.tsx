import { requirePageUser } from "@/server/auth/page-guard";
import { AdminShell } from "@/components/admin-shell";
import { companyFacade } from "@/server/facades/company-facade";
import { prisma } from "@/server/db";
import { CompanyTabs, DataRow, StatusBadge, EmptyState, AlertBanner } from "@/components/industrial";
import { t } from "@/i18n";
import Link from "next/link";
import { CreatePayrollForm } from "./create-form";
import { ApprovalSummary } from "./approval-summary";
import { PopulatePayrollLinesButton } from "./populate-button";
import { diagnosePayrollRun, payrollRunSubtitle } from "@/server/payroll/run-diagnostics";

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

  const diagnosed = await Promise.all(
    runs.map(async (run) => ({
      run,
      diagnostics: await diagnosePayrollRun(run),
    })),
  );

  const employeeCount = companyId
    ? await prisma.employee.count({ where: { companyId } })
    : 0;

  return (
    <AdminShell
      title={t("en", "admin.payroll")}
      description="Create payroll runs by company and month. Employee lines are generated from employment eligibility; bank matching enriches payment status afterward."
      userName={user.email ?? user.phone}
      userRole={user.globalRole}
    >
      <CompanyTabs
        companies={companies}
        activeId={companyId}
        hrefFor={(id) => `/admin/payroll?companyId=${id}`}
      />
      {companyId ? (
        <div className="mb-4">
          <Link
            href={`/admin/companies/${companyId}/payroll`}
            className="text-sm font-semibold text-[var(--nova-teal)] hover:underline"
          >
            {t("en", "company.hub.openWorkspace")} →
          </Link>
        </div>
      ) : null}
      {companyId && employeeCount === 0 ? (
        <div className="mb-4">
          <AlertBanner tone="warning">
            No employees imported for this company. Import employees before creating a payroll run.
          </AlertBanner>
        </div>
      ) : null}
      {companyId ? (
        <div className="mb-6">
          <ApprovalSummary companyId={companyId} />
        </div>
      ) : null}
      {companyId ? <CreatePayrollForm companyId={companyId} /> : null}
      <div className="mt-6 grid gap-3">
        {diagnosed.map(({ run, diagnostics }) => (
          <div key={run.id} className="rounded-lg border border-[var(--nova-border)] p-3">
            <DataRow
              title={`${String(run.month).padStart(2, "0")}/${run.year}`}
              subtitle={payrollRunSubtitle(diagnostics, run._count.lines)}
              action={
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={run.status} tone="info" />
                  <Link
                    href={`/admin/payroll/reconciliation?companyId=${companyId}&runId=${run.id}&filter=unresolved`}
                    className="text-sm font-semibold text-[var(--nova-teal)] hover:underline"
                  >
                    Reconciliation
                  </Link>
                </div>
              }
            />
            {run._count.lines === 0 || diagnostics.reason !== "ok" ? (
              <div className="mt-2 space-y-2">
                {run._count.lines === 0 ? (
                  <AlertBanner tone="warning">{diagnostics.nextAction}</AlertBanner>
                ) : null}
                <div className="text-xs text-[var(--nova-muted)]">
                  Employees found {diagnostics.employeesFound} · Eligible {diagnostics.eligibleEmployees} ·
                  Lines {diagnostics.linesCreated} · Salary review {diagnostics.salaryReviewRequired} ·
                  Matched {diagnostics.paymentsMatched} · Unmatched {diagnostics.paymentsUnmatched}
                </div>
                {["DRAFT", "RECONCILIATION_REQUIRED", "READY_FOR_REVIEW", "FAILED", "PARSING"].includes(
                  run.status,
                ) ? (
                  <PopulatePayrollLinesButton runId={run.id} lineCount={run._count.lines} />
                ) : null}
              </div>
            ) : (
              <div className="mt-2">
                <PopulatePayrollLinesButton runId={run.id} lineCount={run._count.lines} />
              </div>
            )}
          </div>
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

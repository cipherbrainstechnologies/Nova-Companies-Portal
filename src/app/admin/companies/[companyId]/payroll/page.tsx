import { prisma } from "@/server/db";
import { DataRow, StatusBadge, EmptyState, AlertBanner } from "@/components/industrial";
import { t } from "@/i18n";
import Link from "next/link";
import { CreatePayrollForm } from "@/app/admin/payroll/create-form";
import { ApprovalSummary } from "@/app/admin/payroll/approval-summary";
import { PopulatePayrollLinesButton } from "@/app/admin/payroll/populate-button";
import { diagnosePayrollRun, payrollRunSubtitle } from "@/server/payroll/run-diagnostics";

export default async function CompanyPayrollPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const runs = await prisma.payrollRun.findMany({
    where: { companyId },
    include: { _count: { select: { lines: true } } },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
  const employeeCount = await prisma.employee.count({ where: { companyId } });
  const diagnosed = await Promise.all(
    runs.map(async (run) => ({
      run,
      diagnostics: await diagnosePayrollRun(run),
    })),
  );

  return (
    <div>
      <div className="mb-6">
        <ApprovalSummary companyId={companyId} />
      </div>
      {employeeCount === 0 ? (
        <div className="mb-4">
          <AlertBanner tone="warning">
            No employees imported for this company. Import employees before creating a payroll run.
          </AlertBanner>
        </div>
      ) : null}
      <CreatePayrollForm companyId={companyId} />
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
          </div>
        ))}
        {!runs.length ? (
          <EmptyState
            title={t("en", "company.hub.noPayroll")}
            description={t("en", "company.hub.noPayrollBody")}
          />
        ) : null}
      </div>
    </div>
  );
}

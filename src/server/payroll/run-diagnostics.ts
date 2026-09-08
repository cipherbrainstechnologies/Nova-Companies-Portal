import { prisma } from "@/server/db";
import {
  evaluateEmploymentEligibility,
  payrollPeriodBounds,
  selectEffectiveSalaryStructure,
  summarizePopulateReason,
  type PopulateDiagnostics,
} from "@/server/payroll/period-eligibility";

/** Server-side diagnostics for a payroll run list row (no mutations). */
export async function diagnosePayrollRun(run: {
  id: string;
  companyId: string;
  year: number;
  month: number;
  status: string;
  _count: { lines: number };
}): Promise<PopulateDiagnostics> {
  const period = payrollPeriodBounds(run.year, run.month);
  const runEditable = !["ISSUED", "ISSUING", "CANCELLED", "SUPERSEDED"].includes(run.status);

  const [employees, lines] = await Promise.all([
    prisma.employee.findMany({
      where: { companyId: run.companyId },
      select: {
        id: true,
        dateOfJoining: true,
        status: true,
        salaryStructure: true,
        salaryStructureVersions: {
          select: {
            version: true,
            effectiveFrom: true,
            effectiveTo: true,
          },
        },
      },
    }),
    prisma.payrollEmployeeLine.findMany({
      where: { payrollRunId: run.id },
      select: { paymentStatus: true },
    }),
  ]);

  let excludedJoinedAfter = 0;
  let excludedExitedBefore = 0;
  let salaryReviewRequired = 0;
  const eligible = employees.filter((employee) => {
    const result = evaluateEmploymentEligibility(employee, period);
    if (!result.eligible) {
      if (result.reason === "joined_after_period") excludedJoinedAfter += 1;
      if (result.reason === "exited_before_period") excludedExitedBefore += 1;
      return false;
    }
    return true;
  });

  for (const employee of eligible) {
    const effective = selectEffectiveSalaryStructure({
      period,
      current: employee.salaryStructure
        ? {
            version: employee.salaryStructure.version,
            effectiveFrom: employee.salaryStructure.effectiveFrom,
          }
        : null,
      versions: employee.salaryStructureVersions,
    });
    if (effective.status === "missing_historical") salaryReviewRequired += 1;
  }

  const fromLines = lines.filter((line) => line.paymentStatus === "SALARY_STRUCTURE_INCOMPLETE").length;
  const paymentsMatched = lines.filter((line) =>
    ["MATCHED_EXACT", "PARTIAL_PAYMENT_REVIEW_REQUIRED", "AMOUNT_MISMATCH_REVIEW_REQUIRED", "APPROVED_FOR_ISSUE", "MANUALLY_MAPPED"].includes(
      line.paymentStatus,
    ),
  ).length;
  const paymentsUnmatched = lines.filter((line) => line.paymentStatus === "UNMATCHED").length;

  const counts = {
    employeesFound: employees.length,
    eligibleEmployees: eligible.length,
    excludedJoinedAfter,
    excludedExitedBefore,
    linesCreated: run._count.lines,
    linesPreserved: 0,
    linesRefreshed: 0,
    salaryReviewRequired: Math.max(salaryReviewRequired, fromLines),
    paymentsMatched,
    paymentsUnmatched,
    contactDetailsMissing: 0,
    runEditable,
  };

  // Prefer empty-run explanations over salary-review when nothing was generated.
  if (run._count.lines === 0) {
    const empty = summarizePopulateReason({ ...counts, linesCreated: 0 });
    return { ...counts, ...empty };
  }

  const { reason, nextAction } = summarizePopulateReason(counts);
  return { ...counts, reason, nextAction };
}

export function payrollRunSubtitle(diagnostics: PopulateDiagnostics, lineCount: number): string {
  if (lineCount === 0) {
    const labels: Record<PopulateDiagnostics["reason"], string> = {
      ok: `${lineCount} employee lines`,
      no_employees_in_company: "No employees imported for this company",
      no_employees_employed_during_period: "No employees employed during this period",
      historical_salary_review_required: "Historical salary structures require review",
      run_not_editable: "Run is locked — cannot populate lines",
      permission_or_company_mismatch: "Permission or company mismatch",
    };
    return `${labels[diagnostics.reason]} · ${diagnostics.nextAction}`;
  }
  return (
    `${lineCount} employee lines · Eligible ${diagnostics.eligibleEmployees} · ` +
    `Salary review ${diagnostics.salaryReviewRequired} · ` +
    `Matched ${diagnostics.paymentsMatched} · Unmatched ${diagnostics.paymentsUnmatched}`
  );
}

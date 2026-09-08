/**
 * Pure helpers for payroll-period eligibility and historical salary selection.
 * Free of Prisma so unit tests stay hermetic.
 */

export type EmploymentLike = {
  id: string;
  dateOfJoining?: Date | string | null;
  /** Login/access flag — never used alone to exclude from payroll preparation. */
  status: "ACTIVE" | "CONTACT_DETAILS_REQUIRED" | "BLOCKED" | "EXITED" | string;
  /** Optional exit date when modelled; absent means exit timing is unknown. */
  dateOfExit?: Date | string | null;
};

export type StructureVersionLike = {
  version: number;
  effectiveFrom: Date | string;
  effectiveTo?: Date | string | null;
  annualCtc?: unknown;
  monthlyGross?: unknown;
  monthlyTds?: unknown;
  monthlyPt?: unknown;
  expectedMonthlyNet?: unknown;
  componentsJson?: unknown;
  notes?: string | null;
};

export type PayrollPeriodBounds = {
  year: number;
  month: number;
  periodStart: Date;
  periodEnd: Date;
};

export function toUtcDate(value: Date | string | null | undefined): Date | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Inclusive calendar-month bounds in UTC. */
export function payrollPeriodBounds(year: number, month: number): PayrollPeriodBounds {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("Invalid payroll period");
  }
  const periodStart = new Date(Date.UTC(year, month - 1, 1));
  const periodEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  return { year, month, periodStart, periodEnd };
}

export type EligibilityResult =
  | { eligible: true; reason: "employed_during_period" }
  | {
      eligible: false;
      reason:
        | "joined_after_period"
        | "exited_before_period"
        | "not_in_company";
    };

/**
 * Employment overlap with the salary month. Login BLOCKED / CONTACT_DETAILS_REQUIRED
 * does not exclude. EXITED employees remain eligible for months before their exit.
 */
export function evaluateEmploymentEligibility(
  employee: EmploymentLike,
  period: PayrollPeriodBounds,
): EligibilityResult {
  const doj = toUtcDate(employee.dateOfJoining);
  if (doj && doj.getTime() > period.periodEnd.getTime()) {
    return { eligible: false, reason: "joined_after_period" };
  }

  const exit = toUtcDate(employee.dateOfExit);
  if (exit && exit.getTime() < period.periodStart.getTime()) {
    return { eligible: false, reason: "exited_before_period" };
  }

  return { eligible: true, reason: "employed_during_period" };
}

export type EffectiveStructureResult =
  | {
      status: "found";
      structure: StructureVersionLike;
      source: "version" | "current";
    }
  | {
      status: "missing_historical";
      /** Present but starts after the payroll month — must not be applied retrospectively. */
      futureStructure?: StructureVersionLike;
    };

function coversPeriod(
  effectiveFrom: Date,
  effectiveTo: Date | null,
  period: PayrollPeriodBounds,
): boolean {
  if (effectiveFrom.getTime() > period.periodEnd.getTime()) return false;
  if (effectiveTo && effectiveTo.getTime() < period.periodStart.getTime()) return false;
  return true;
}

/**
 * Salary applicable to the payroll month. Never applies a structure whose
 * effectiveFrom is after the month end (no silent retrospective of today's pay).
 */
export function selectEffectiveSalaryStructure(input: {
  period: PayrollPeriodBounds;
  current?: StructureVersionLike | null;
  versions?: StructureVersionLike[];
}): EffectiveStructureResult {
  const candidates: Array<{ structure: StructureVersionLike; source: "version" | "current" }> = [];

  for (const version of input.versions ?? []) {
    const from = toUtcDate(version.effectiveFrom);
    if (!from) continue;
    const to = toUtcDate(version.effectiveTo ?? null);
    if (!coversPeriod(from, to, input.period)) continue;
    candidates.push({ structure: version, source: "version" });
  }

  if (input.current) {
    const from = toUtcDate(input.current.effectiveFrom);
    if (from && coversPeriod(from, null, input.period)) {
      // Prefer explicit version history when it already covers the month.
      const already = candidates.some((c) => c.structure.version === input.current!.version);
      if (!already) candidates.push({ structure: input.current, source: "current" });
    }
  }

  if (!candidates.length) {
    const future =
      input.current &&
      toUtcDate(input.current.effectiveFrom) &&
      toUtcDate(input.current.effectiveFrom)!.getTime() > input.period.periodEnd.getTime()
        ? input.current
        : (input.versions ?? [])
            .map((v) => ({ v, from: toUtcDate(v.effectiveFrom) }))
            .filter((x) => x.from && x.from.getTime() > input.period.periodEnd.getTime())
            .sort((a, b) => a.from!.getTime() - b.from!.getTime())[0]?.v;
    return { status: "missing_historical", futureStructure: future };
  }

  candidates.sort((a, b) => {
    const aFrom = toUtcDate(a.structure.effectiveFrom)!.getTime();
    const bFrom = toUtcDate(b.structure.effectiveFrom)!.getTime();
    if (aFrom !== bFrom) return bFrom - aFrom;
    return (b.structure.version ?? 0) - (a.structure.version ?? 0);
  });

  return { status: "found", structure: candidates[0].structure, source: candidates[0].source };
}

/** Configurable bank-payment search window around the salary month. */
export type PaymentSearchWindow = {
  daysBefore: number;
  daysAfter: number;
  searchStart: Date;
  searchEnd: Date;
};

export const DEFAULT_PAYMENT_SEARCH_DAYS_BEFORE = 10;
export const DEFAULT_PAYMENT_SEARCH_DAYS_AFTER = 45;

export function paymentSearchWindow(
  period: PayrollPeriodBounds,
  options?: { daysBefore?: number; daysAfter?: number },
): PaymentSearchWindow {
  const daysBefore = options?.daysBefore ?? DEFAULT_PAYMENT_SEARCH_DAYS_BEFORE;
  const daysAfter = options?.daysAfter ?? DEFAULT_PAYMENT_SEARCH_DAYS_AFTER;
  const searchStart = new Date(period.periodStart);
  searchStart.setUTCDate(searchStart.getUTCDate() - daysBefore);
  const searchEnd = new Date(period.periodEnd);
  searchEnd.setUTCDate(searchEnd.getUTCDate() + daysAfter);
  return { daysBefore, daysAfter, searchStart, searchEnd };
}

export type PopulateDiagnostics = {
  employeesFound: number;
  eligibleEmployees: number;
  excludedJoinedAfter: number;
  excludedExitedBefore: number;
  linesCreated: number;
  linesPreserved: number;
  linesRefreshed: number;
  salaryReviewRequired: number;
  paymentsMatched: number;
  paymentsUnmatched: number;
  contactDetailsMissing: number;
  reason:
    | "ok"
    | "no_employees_in_company"
    | "no_employees_employed_during_period"
    | "historical_salary_review_required"
    | "run_not_editable"
    | "permission_or_company_mismatch";
  nextAction: string;
};

export function summarizePopulateReason(
  diagnostics: Omit<PopulateDiagnostics, "reason" | "nextAction"> & {
    runEditable: boolean;
  },
): Pick<PopulateDiagnostics, "reason" | "nextAction"> {
  if (!diagnostics.runEditable) {
    return {
      reason: "run_not_editable",
      nextAction: "Issued or cancelled runs cannot be re-populated. Create a correction payslip if needed.",
    };
  }
  if (diagnostics.employeesFound === 0) {
    return {
      reason: "no_employees_in_company",
      nextAction: "Import employees for this company, then Populate / Refresh Employee Lines.",
    };
  }
  if (diagnostics.eligibleEmployees === 0) {
    return {
      reason: "no_employees_employed_during_period",
      nextAction: "No employees overlap this salary month. Check joining dates and company scope.",
    };
  }
  if (diagnostics.salaryReviewRequired > 0) {
    return {
      reason: "historical_salary_review_required",
      nextAction:
        "Confirm or supply the salary structure that applied in this month before approval/issue.",
    };
  }
  return {
    reason: "ok",
    nextAction: "Review unmatched payments, then approve lines ready for issue.",
  };
}

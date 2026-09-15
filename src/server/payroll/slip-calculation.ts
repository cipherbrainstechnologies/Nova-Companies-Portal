/**
 * Shared salary-slip calculation: attendance, earning proration, deductions, payment schedule.
 * Used by Create Salary Slip, populate-run, preview, approval, and PDF paths.
 *
 * Rounding policy (INR):
 * 1. Intermediate math uses decimal.js (ROUND_HALF_UP).
 * 2. Each prorated component is first rounded to 2 dp.
 * 3. Target payable gross = roundInr(fullGross × PD / WD).
 * 4. Residual (target − Σ rounded payables) is allocated in 0.01 steps to the
 *    largest full-month components so Σ payable equals the target exactly.
 * Statutory deductions (TDS/PT/PF/ESI) are never scaled by PD/WD unless an
 * explicit override says so.
 */

import { money, roundInr } from "@/server/finance/money";
import Decimal from "decimal.js";

/** Nearest-rupee rounding used for payable-gross targets (CA reference: 108334×29/31 → 101345). */
export function roundInrWhole(n: number | string | Decimal): number {
  return money(n).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
}
import {
  DEFAULT_DEDUCTION_CODES,
  DEFAULT_EARNING_CODES,
  componentsFromJson,
  structureToEarningsDeductions,
  type SalaryStructureRecord,
} from "@/server/payroll/salary-structure";
import {
  expectedSalaryPaymentDate,
  paymentSearchWindow,
  payrollPeriodBounds,
  toUtcDate,
  type PayrollPeriodBounds,
} from "@/server/payroll/period-eligibility";

export type AttendanceBasis = "CALENDAR_DAY" | "FIXED_30" | "WORKING_DAY";

export type EarningCalcBasis = "PRORATED" | "FIXED_MONTHLY" | "ACTUAL_APPROVED";

export type ComponentOverride = {
  code: string;
  /** Full-month (actual) amount when provided. */
  actual?: number;
  /** Payable amount override. */
  payable: number;
  reason: string;
};

export type LeaveCounts = {
  casualLeave?: number;
  privilegedLeave?: number;
  sickLeave?: number;
  /** Unpaid days strictly within the employed service window (not pre-joining). */
  leaveWithoutPay?: number;
  weeklyOffs?: number;
  paidHolidays?: number;
};

export type AttendanceInput = {
  year: number;
  month: number;
  dateOfJoining?: Date | string | null;
  dateOfExit?: Date | string | null;
  basis: AttendanceBasis;
  /** Recorded leave / offs; omitted fields default to 0. */
  leave?: LeaveCounts;
  /**
   * When true, treat eligible service days as fully paid (no attendance source).
   * Caller must surface “Assumed full attendance — confirm”.
   */
  assumeFullAttendance?: boolean;
  /** Working-day calendars: count of working days in the month (required for WORKING_DAY). */
  configuredWorkingDaysInMonth?: number | null;
  /** Working-day calendars: present working days including paid leave on working days. */
  configuredPresentWorkingDays?: number | null;
};

export type AttendanceResult = {
  basis: AttendanceBasis;
  periodStart: string;
  periodEnd: string;
  serviceStart: string | null;
  serviceEnd: string | null;
  /** Calendar days in the salary month (always). */
  calendarDaysInMonth: number;
  /** Denominator for proration (WD on the slip). */
  workingDays: number;
  weeklyOffs: number;
  paidHolidays: number;
  /** Payable days (PD). */
  presentDays: number;
  casualLeave: number;
  privilegedLeave: number;
  sickLeave: number;
  leaveWithoutPay: number;
  eligibleServiceDays: number;
  assumedFullAttendance: boolean;
  notes: string[];
};

export type CalculatedEarning = {
  code: string;
  label: string;
  actual: number;
  payable: number;
  basis: EarningCalcBasis;
  calculatedPayable: number;
  overrideApplied: boolean;
  overrideReason?: string;
};

export type CalculatedDeduction = {
  code: string;
  label: string;
  amount: number;
  overrideApplied: boolean;
  overrideReason?: string;
};

export type SlipCalculationResult = {
  attendance: AttendanceResult;
  earnings: CalculatedEarning[];
  deductions: CalculatedDeduction[];
  fullMonthGross: number;
  payableGross: number;
  grossDeductions: number;
  netAmount: number;
  cashComponent: number;
  expectedPaymentDate: string;
  warnings: string[];
  blockingIssues: string[];
  componentStructureRequired: boolean;
};

function utcYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function endOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}

/** Inclusive calendar-day count between two UTC dates (date-only). */
export function inclusiveCalendarDays(start: Date, end: Date): number {
  const a = startOfUtcDay(start).getTime();
  const b = startOfUtcDay(end).getTime();
  if (b < a) return 0;
  return Math.floor((b - a) / 86_400_000) + 1;
}

export function calendarDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function expectedSalaryPaymentDateIso(year: number, month: number): string {
  return utcYmd(expectedSalaryPaymentDate(year, month));
}

export function computeAttendance(input: AttendanceInput): AttendanceResult {
  const period = payrollPeriodBounds(input.year, input.month);
  const calendarDays = calendarDaysInMonth(input.year, input.month);
  const notes: string[] = [];
  const leave = input.leave ?? {};
  const cl = leave.casualLeave ?? 0;
  const pl = leave.privilegedLeave ?? 0;
  const sl = leave.sickLeave ?? 0;
  const lwp = Math.max(0, leave.leaveWithoutPay ?? 0);
  const wo = leave.weeklyOffs ?? 0;
  const ph = leave.paidHolidays ?? 0;

  const doj = toUtcDate(input.dateOfJoining);
  const exit = toUtcDate(input.dateOfExit);

  const serviceStart = doj && doj.getTime() > period.periodStart.getTime() ? startOfUtcDay(doj) : period.periodStart;
  const serviceEnd =
    exit && exit.getTime() < period.periodEnd.getTime() ? endOfUtcDay(exit) : period.periodEnd;

  let eligibleServiceDays = 0;
  if (serviceStart.getTime() <= serviceEnd.getTime()) {
    // If joined after period end or exited before start, eligible is 0 (caller eligibility usually excludes).
    if (
      (doj && doj.getTime() > period.periodEnd.getTime()) ||
      (exit && exit.getTime() < period.periodStart.getTime())
    ) {
      eligibleServiceDays = 0;
    } else {
      eligibleServiceDays = inclusiveCalendarDays(serviceStart, serviceEnd);
    }
  }

  // Pre-joining days are NOT LWP.
  const unpaidWithinService = Math.min(lwp, eligibleServiceDays);
  if (lwp > eligibleServiceDays) {
    notes.push("LWP capped to eligible service days (pre-joining days are not LWP).");
  }

  let workingDays: number;
  let presentDays: number;
  let assumedFullAttendance = Boolean(input.assumeFullAttendance);

  if (input.basis === "FIXED_30") {
    workingDays = 30;
    presentDays = Math.max(0, Math.min(30, eligibleServiceDays - unpaidWithinService));
    notes.push("Attendance basis: fixed 30-day month.");
  } else if (input.basis === "WORKING_DAY") {
    const wd = input.configuredWorkingDaysInMonth;
    const pd = input.configuredPresentWorkingDays;
    if (wd == null || wd <= 0 || pd == null) {
      workingDays = calendarDays;
      presentDays = Math.max(0, eligibleServiceDays - unpaidWithinService);
      assumedFullAttendance = true;
      notes.push(
        "Working-day calendar not configured — fell back to calendar-day eligible service days. Assumed full attendance — confirm.",
      );
    } else {
      workingDays = wd;
      presentDays = Math.max(0, Math.min(wd, pd));
      notes.push("Attendance basis: working-day calendar.");
    }
  } else {
    // CALENDAR_DAY (default / Parth reference)
    workingDays = calendarDays;
    presentDays = Math.max(0, eligibleServiceDays - unpaidWithinService);
    notes.push("Attendance basis: calendar-day month.");
  }

  if (assumedFullAttendance || input.assumeFullAttendance) {
    assumedFullAttendance = true;
    if (!notes.some((n) => n.includes("Assumed full attendance"))) {
      notes.push("Assumed full attendance — confirm.");
    }
  }

  return {
    basis: input.basis,
    periodStart: utcYmd(period.periodStart),
    periodEnd: utcYmd(period.periodEnd),
    serviceStart: eligibleServiceDays > 0 ? utcYmd(serviceStart) : null,
    serviceEnd: eligibleServiceDays > 0 ? utcYmd(startOfUtcDay(serviceEnd)) : null,
    calendarDaysInMonth: calendarDays,
    workingDays,
    weeklyOffs: wo,
    paidHolidays: ph,
    presentDays,
    casualLeave: cl,
    privilegedLeave: pl,
    sickLeave: sl,
    leaveWithoutPay: unpaidWithinService,
    eligibleServiceDays,
    assumedFullAttendance,
    notes,
  };
}

/**
 * Prorate full-month amounts by PD/WD with residual allocation so payables sum to target gross.
 */
export function prorateEarnings(input: {
  fullMonth: Array<{ code: string; label: string; amount: number; basis?: EarningCalcBasis }>;
  presentDays: number;
  workingDays: number;
  overrides?: ComponentOverride[];
}): { earnings: CalculatedEarning[]; fullMonthGross: number; payableGross: number } {
  const overrideByCode = new Map(
    (input.overrides ?? []).map((o) => [o.code.toUpperCase(), o] as const),
  );
  const wd = input.workingDays > 0 ? input.workingDays : 1;
  const pd = Math.max(0, input.presentDays);

  const fullMonthGross = roundInr(
    input.fullMonth.reduce((sum, row) => sum + (Number.isFinite(row.amount) ? row.amount : 0), 0),
  );
  const targetPayableGross =
    pd === 0 || wd === 0
      ? 0
      : pd === wd
        ? fullMonthGross
        : roundInrWhole(money(fullMonthGross).mul(pd).div(wd));

  type Row = CalculatedEarning & { sortKey: number };
  const rows: Row[] = input.fullMonth.map((row, index) => {
    const basis = row.basis ?? "PRORATED";
    const override = overrideByCode.get(row.code.toUpperCase());
    let calculatedPayable: number;
    if (basis === "FIXED_MONTHLY" || basis === "ACTUAL_APPROVED") {
      calculatedPayable = roundInr(row.amount);
    } else if (pd === 0 || wd === 0) {
      calculatedPayable = 0;
    } else if (pd === wd) {
      calculatedPayable = roundInr(row.amount);
    } else {
      calculatedPayable = roundInr(money(row.amount).mul(pd).div(wd));
    }

    if (override) {
      return {
        code: row.code,
        label: row.label,
        actual: override.actual != null ? roundInr(override.actual) : roundInr(row.amount),
        payable: roundInr(override.payable),
        basis,
        calculatedPayable,
        overrideApplied: true,
        overrideReason: override.reason,
        sortKey: index,
      };
    }

    return {
      code: row.code,
      label: row.label,
      actual: roundInr(row.amount),
      payable: calculatedPayable,
      basis,
      calculatedPayable,
      overrideApplied: false,
      sortKey: index,
    };
  });

  // Extra override-only rows (not in structure) are appended as ACTUAL_APPROVED.
  for (const override of input.overrides ?? []) {
    if (rows.some((r) => r.code.toUpperCase() === override.code.toUpperCase())) continue;
    rows.push({
      code: override.code,
      label: override.code,
      actual: override.actual != null ? roundInr(override.actual) : roundInr(override.payable),
      payable: roundInr(override.payable),
      basis: "ACTUAL_APPROVED",
      calculatedPayable: roundInr(override.payable),
      overrideApplied: true,
      overrideReason: override.reason,
      sortKey: rows.length,
    });
  }

  const anyOverride = rows.some((r) => r.overrideApplied);
  if (!anyOverride) {
    // Residual allocation so Σ payable === targetPayableGross.
    let sumPayable = roundInr(rows.reduce((s, r) => s + r.payable, 0));
    let residualPaise = Math.round((targetPayableGross - sumPayable) * 100);
    if (residualPaise !== 0 && rows.length) {
      const order = [...rows].sort((a, b) => b.actual - a.actual || a.sortKey - b.sortKey);
      let i = 0;
      while (residualPaise !== 0 && order.length) {
        const target = order[i % order.length];
        const step = residualPaise > 0 ? 0.01 : -0.01;
        target.payable = roundInr(target.payable + step);
        residualPaise += residualPaise > 0 ? -1 : 1;
        i += 1;
        if (i > order.length * 1000) break;
      }
      sumPayable = roundInr(rows.reduce((s, r) => s + r.payable, 0));
    }
  }

  const payableGross = roundInr(rows.reduce((s, r) => s + r.payable, 0));
  return {
    earnings: rows.map(({ sortKey: _s, ...rest }) => rest),
    fullMonthGross,
    payableGross,
  };
}

function fullMonthEarningsFromStructure(structure: SalaryStructureRecord | null | undefined): {
  rows: Array<{ code: string; label: string; amount: number }>;
  componentStructureRequired: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  if (!structure) {
    return { rows: [], componentStructureRequired: true, warnings: ["Effective salary structure missing."] };
  }

  const components = componentsFromJson(structure.componentsJson);
  const rows: Array<{ code: string; label: string; amount: number }> = [];
  const consumed = new Set<string>();

  for (const def of DEFAULT_EARNING_CODES) {
    const amount = components[def.code];
    if (amount == null || amount === 0) continue;
    consumed.add(def.code);
    rows.push({ code: def.code, label: def.label, amount: roundInr(amount) });
  }

  // Unknown earning-like keys (skip known deductions / net keys handled in componentsFromJson consumers).
  const deductionCodes = new Set(DEFAULT_DEDUCTION_CODES.map((d) => d.code));
  for (const [code, amount] of Object.entries(components)) {
    if (consumed.has(code) || deductionCodes.has(code)) continue;
    if (["NETPAY", "NETAMOUNT", "NETSALARY", "GROSS", "GROSSEARNINGS", "GROSSDEDUCTIONS"].includes(code.replace(/[^A-Z0-9]/gi, "").toUpperCase())) {
      continue;
    }
    rows.push({ code, label: code, amount: roundInr(amount) });
  }

  if (rows.length) {
    return { rows, componentStructureRequired: false, warnings };
  }

  const monthlyGross =
    structure.monthlyGross != null ? Number(structure.monthlyGross) : null;
  if (monthlyGross != null && Number.isFinite(monthlyGross) && monthlyGross > 0) {
    warnings.push(
      "Component structure required — only monthly gross is stored. Using consolidated-gross row (not labelled as Basic).",
    );
    return {
      rows: [{ code: "GROSS", label: "Consolidated gross", amount: roundInr(monthlyGross) }],
      componentStructureRequired: true,
      warnings,
    };
  }

  return {
    rows: [],
    componentStructureRequired: true,
    warnings: ["Component structure required — no earning components or gross on the salary structure."],
  };
}

function deductionsFromStructure(
  structure: SalaryStructureRecord | null | undefined,
  overrides?: ComponentOverride[],
): CalculatedDeduction[] {
  const derived = structure ? structureToEarningsDeductions(structure).deductions : [];
  const overrideByCode = new Map(
    (overrides ?? []).map((o) => [o.code.toUpperCase(), o] as const),
  );
  const rows: CalculatedDeduction[] = derived.map((d) => {
    const override = overrideByCode.get(d.code.toUpperCase());
    if (override) {
      return {
        code: d.code,
        label: d.label,
        amount: roundInr(override.payable),
        overrideApplied: true,
        overrideReason: override.reason,
      };
    }
    return {
      code: d.code,
      label: d.label,
      amount: roundInr(d.amount),
      overrideApplied: false,
    };
  });

  for (const override of overrides ?? []) {
    if (rows.some((r) => r.code.toUpperCase() === override.code.toUpperCase())) continue;
    // Only treat as deduction override when code is a known deduction or explicitly tagged.
    if (!DEFAULT_DEDUCTION_CODES.some((d) => d.code === override.code.toUpperCase())) continue;
    rows.push({
      code: override.code,
      label: override.code,
      amount: roundInr(override.payable),
      overrideApplied: true,
      overrideReason: override.reason,
    });
  }
  return rows;
}

export type CalculateSlipInput = {
  year: number;
  month: number;
  dateOfJoining?: Date | string | null;
  dateOfExit?: Date | string | null;
  attendanceBasis: AttendanceBasis;
  leave?: LeaveCounts;
  assumeFullAttendance?: boolean;
  configuredWorkingDaysInMonth?: number | null;
  configuredPresentWorkingDays?: number | null;
  structure?: SalaryStructureRecord | null;
  /** Period-specific CA / reviewer overrides (never generalized). */
  earningOverrides?: ComponentOverride[];
  deductionOverrides?: ComponentOverride[];
  cashComponent?: number;
  attendanceConfirmed?: boolean;
};

export function calculateSalarySlip(input: CalculateSlipInput): SlipCalculationResult {
  const attendance = computeAttendance({
    year: input.year,
    month: input.month,
    dateOfJoining: input.dateOfJoining,
    dateOfExit: input.dateOfExit,
    basis: input.attendanceBasis,
    leave: input.leave,
    assumeFullAttendance: input.assumeFullAttendance,
    configuredWorkingDaysInMonth: input.configuredWorkingDaysInMonth,
    configuredPresentWorkingDays: input.configuredPresentWorkingDays,
  });

  const { rows, componentStructureRequired, warnings } = fullMonthEarningsFromStructure(
    input.structure,
  );
  const prorated = prorateEarnings({
    fullMonth: rows,
    presentDays: attendance.presentDays,
    workingDays: attendance.workingDays,
    overrides: input.earningOverrides,
  });

  const deductions = deductionsFromStructure(input.structure, input.deductionOverrides);
  const grossDeductions = roundInr(deductions.reduce((s, d) => s + d.amount, 0));
  const cashComponent = roundInr(input.cashComponent ?? 0);
  const netAmount = roundInr(money(prorated.payableGross).minus(grossDeductions).plus(cashComponent));

  const blockingIssues: string[] = [];
  if (componentStructureRequired && !prorated.earnings.length) {
    blockingIssues.push("Component structure required before approval.");
  }
  if (attendance.assumedFullAttendance && !input.attendanceConfirmed) {
    blockingIssues.push("Attendance is assumed — confirm before approval/issue.");
  }
  if (attendance.eligibleServiceDays <= 0) {
    blockingIssues.push("No eligible service days in this salary month.");
  }

  return {
    attendance,
    earnings: prorated.earnings,
    deductions,
    fullMonthGross: prorated.fullMonthGross,
    payableGross: prorated.payableGross,
    grossDeductions,
    netAmount,
    cashComponent,
    expectedPaymentDate: expectedSalaryPaymentDateIso(input.year, input.month),
    warnings: [...attendance.notes, ...warnings],
    blockingIssues,
    componentStructureRequired,
  };
}

/**
 * Historical Parth Virani August 2026 CA-approved component payables.
 * Apply only when explicitly requested for that reference — never as a global rule.
 */
export const PARTH_AUG_2026_CA_EARNING_OVERRIDES: ComponentOverride[] = [
  { code: "BASIC", actual: 54000, payable: 50500, reason: "CA-approved Aug 2026 slip (Parth Virani)" },
  { code: "HRA", actual: 27000, payable: 25250, reason: "CA-approved Aug 2026 slip (Parth Virani)" },
  { code: "CONVEYANCE", actual: 2600, payable: 2400, reason: "CA-approved Aug 2026 slip (Parth Virani)" },
  { code: "MEDICAL", actual: 2300, payable: 2100, reason: "CA-approved Aug 2026 slip (Parth Virani)" },
  { code: "SPECIAL", actual: 9400, payable: 8800, reason: "CA-approved Aug 2026 slip (Parth Virani)" },
  { code: "TRAVEL", actual: 2600, payable: 2400, reason: "CA-approved Aug 2026 slip (Parth Virani)" },
  { code: "OTHER_ALLOWANCE", actual: 10434, payable: 9895, reason: "CA-approved Aug 2026 slip (Parth Virani)" },
];

export const PARTH_AUG_2026_CA_DEDUCTION_OVERRIDES: ComponentOverride[] = [
  { code: "TDS", payable: 5525, reason: "CA-approved Aug 2026 TDS (do not recalculate)" },
  { code: "PT", payable: 200, reason: "CA-approved Aug 2026 professional tax" },
];

/** Re-export: payment search window around expected pay date (1st of next month). */
export function paymentSearchWindowAroundExpectedPay(
  period: PayrollPeriodBounds,
  options?: { daysBefore?: number; daysAfter?: number },
) {
  return paymentSearchWindow(period, options);
}

export { expectedSalaryPaymentDate };

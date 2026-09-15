import { prisma } from "@/server/db";
import { employeeFacade } from "@/server/facades/employee-facade";
import {
  calculateSalarySlip,
  PARTH_AUG_2026_CA_DEDUCTION_OVERRIDES,
  PARTH_AUG_2026_CA_EARNING_OVERRIDES,
  type AttendanceBasis,
  type ComponentOverride,
  type SlipCalculationResult,
} from "@/server/payroll/slip-calculation";
import {
  paymentSearchWindow,
  payrollPeriodBounds,
  selectEffectiveSalaryStructure,
} from "@/server/payroll/period-eligibility";
import {
  isSalaryStructureComplete,
  type SalaryStructureRecord,
} from "@/server/payroll/salary-structure";
import { searchAllocatablePayments } from "@/server/payroll/payment-auto-match";

function asStructureRecord(row: {
  version?: number | null;
  effectiveFrom: Date | string;
  annualCtc?: unknown;
  monthlyGross?: unknown;
  monthlyTds?: unknown;
  monthlyPt?: unknown;
  expectedMonthlyNet?: unknown;
  componentsJson?: unknown;
  notes?: string | null;
}): SalaryStructureRecord {
  return {
    version: row.version ?? 1,
    effectiveFrom: row.effectiveFrom instanceof Date ? row.effectiveFrom : new Date(row.effectiveFrom),
    annualCtc: row.annualCtc as SalaryStructureRecord["annualCtc"],
    monthlyGross: row.monthlyGross as SalaryStructureRecord["monthlyGross"],
    monthlyTds: row.monthlyTds as SalaryStructureRecord["monthlyTds"],
    monthlyPt: row.monthlyPt as SalaryStructureRecord["monthlyPt"],
    expectedMonthlyNet: row.expectedMonthlyNet as SalaryStructureRecord["expectedMonthlyNet"],
    componentsJson: row.componentsJson,
    notes: row.notes,
  };
}

export type SlipPrefillResult = {
  employee: {
    id: string;
    employeeCode: string;
    name: string;
    dateOfJoining: string | null;
    dateOfExit: string | null;
  };
  company: {
    id: string;
    name: string;
    attendanceBasis: AttendanceBasis;
    paymentSearchDaysBefore: number;
    paymentSearchDaysAfter: number;
  };
  period: { year: number; month: number };
  calculation: SlipCalculationResult;
  structureComplete: boolean;
  existingLine: {
    id: string;
    status: string;
    paymentStatus: string;
    attendanceConfirmed: boolean;
    hasIssuedPayslip: boolean;
  } | null;
  paymentMatch: {
    expectedPaymentDate: string;
    searchStart: string;
    searchEnd: string;
    suggestions: Array<{
      transactionId: string;
      debit: number | null;
      particulars: string;
      txnDate: string;
      recommended: boolean;
    }>;
  };
  appliedCaReference: boolean;
};

/**
 * Builds the shared draft used by Create Salary Slip, populate, and preview.
 */
export async function buildSalarySlipPrefill(input: {
  companyId: string;
  employeeId: string;
  year: number;
  month: number;
  /** Apply Parth Aug-2026 CA overrides only when explicitly requested. */
  applyParthAug2026CaOverrides?: boolean;
  earningOverrides?: ComponentOverride[];
  deductionOverrides?: ComponentOverride[];
  leave?: {
    casualLeave?: number;
    privilegedLeave?: number;
    sickLeave?: number;
    leaveWithoutPay?: number;
    weeklyOffs?: number;
    paidHolidays?: number;
  };
  assumeFullAttendance?: boolean;
  attendanceConfirmed?: boolean;
  cashComponent?: number;
}): Promise<SlipPrefillResult> {
  const employee = await employeeFacade.getById(input.employeeId, input.companyId);
  const company = await prisma.company.findUniqueOrThrow({
    where: { id: input.companyId },
    select: {
      id: true,
      name: true,
      attendanceBasis: true,
      paymentSearchDaysBefore: true,
      paymentSearchDaysAfter: true,
    },
  });

  const period = payrollPeriodBounds(input.year, input.month);
  const versions = await prisma.employeeSalaryStructureVersion.findMany({
    where: { employeeId: employee.id },
    orderBy: { version: "desc" },
  });
  const current = await prisma.employeeSalaryStructure.findUnique({
    where: { employeeId: employee.id },
  });

  const effective = selectEffectiveSalaryStructure({
    period,
    current: current
      ? {
          version: current.version,
          effectiveFrom: current.effectiveFrom,
          annualCtc: current.annualCtc,
          monthlyGross: current.monthlyGross,
          monthlyTds: current.monthlyTds,
          monthlyPt: current.monthlyPt,
          expectedMonthlyNet: current.expectedMonthlyNet,
          componentsJson: current.componentsJson,
          notes: current.notes,
        }
      : null,
    versions,
  });

  const structure =
    effective.status === "found" ? asStructureRecord(effective.structure) : null;

  const applyCa =
    Boolean(input.applyParthAug2026CaOverrides) &&
    input.year === 2026 &&
    input.month === 8 &&
    /parth/i.test(`${employee.firstName} ${employee.lastName}`);

  const earningOverrides = [
    ...(input.earningOverrides ?? []),
    ...(applyCa ? PARTH_AUG_2026_CA_EARNING_OVERRIDES : []),
  ];
  const deductionOverrides = [
    ...(input.deductionOverrides ?? []),
    ...(applyCa ? PARTH_AUG_2026_CA_DEDUCTION_OVERRIDES : []),
  ];

  // No attendance source tables yet → suggest eligible service days as paid; require confirm.
  const assumeFullAttendance = input.assumeFullAttendance ?? true;

  const calculation = calculateSalarySlip({
    year: input.year,
    month: input.month,
    dateOfJoining: employee.dateOfJoining,
    dateOfExit: (employee as { dateOfExit?: Date | null }).dateOfExit ?? null,
    attendanceBasis: company.attendanceBasis as AttendanceBasis,
    leave: input.leave,
    assumeFullAttendance,
    structure,
    earningOverrides,
    deductionOverrides,
    cashComponent: input.cashComponent ?? 0,
    attendanceConfirmed: input.attendanceConfirmed,
  });

  const window = paymentSearchWindow(period, {
    daysBefore: company.paymentSearchDaysBefore,
    daysAfter: company.paymentSearchDaysAfter,
  });

  let suggestions: SlipPrefillResult["paymentMatch"]["suggestions"] = [];
  try {
    const found = await searchAllocatablePayments({
      companyId: input.companyId,
      year: input.year,
      month: input.month,
      employeeId: input.employeeId,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      daysBefore: company.paymentSearchDaysBefore,
      daysAfter: company.paymentSearchDaysAfter,
      limit: 8,
    });
    suggestions = found.results
      .filter((row) => row.inWindow && !row.excludedReason)
      .slice(0, 8)
      .map((row) => ({
        transactionId: row.id,
        debit: row.debit,
        particulars: row.particulars,
        txnDate: row.txnDate,
        recommended: row.recommended,
      }));
  } catch {
    suggestions = [];
  }

  const run = await prisma.payrollRun.findUnique({
    where: {
      companyId_year_month: {
        companyId: input.companyId,
        year: input.year,
        month: input.month,
      },
    },
    select: { id: true },
  });
  const line = run
    ? await prisma.payrollEmployeeLine.findUnique({
        where: {
          payrollRunId_employeeId: {
            payrollRunId: run.id,
            employeeId: input.employeeId,
          },
        },
        include: { payslip: { select: { id: true, status: true } } },
      })
    : null;

  return {
    employee: {
      id: employee.id,
      employeeCode: employee.employeeCode,
      name: `${employee.firstName} ${employee.lastName}`,
      dateOfJoining: employee.dateOfJoining?.toISOString().slice(0, 10) ?? null,
      dateOfExit:
        (employee as { dateOfExit?: Date | null }).dateOfExit?.toISOString().slice(0, 10) ?? null,
    },
    company: {
      id: company.id,
      name: company.name,
      attendanceBasis: company.attendanceBasis as AttendanceBasis,
      paymentSearchDaysBefore: company.paymentSearchDaysBefore,
      paymentSearchDaysAfter: company.paymentSearchDaysAfter,
    },
    period: { year: input.year, month: input.month },
    calculation,
    structureComplete: structure ? isSalaryStructureComplete(structure) : false,
    existingLine: line
      ? {
          id: line.id,
          status: line.status,
          paymentStatus: line.paymentStatus,
          attendanceConfirmed: line.attendanceConfirmed,
          hasIssuedPayslip: Boolean(
            line.payslip && ["ISSUING", "ISSUED"].includes(line.payslip.status),
          ),
        }
      : null,
    paymentMatch: {
      expectedPaymentDate: calculation.expectedPaymentDate,
      searchStart: window.searchStart.toISOString().slice(0, 10),
      searchEnd: window.searchEnd.toISOString().slice(0, 10),
      suggestions,
    },
    appliedCaReference: applyCa,
  };
}

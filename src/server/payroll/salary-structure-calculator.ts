import {
  calculateAnnualIncomeTax,
  roundPaise,
  TDS_DISCLAIMER,
  type AnnualTaxBreakdown,
} from "@/server/tds/tds-engine";
import {
  financialYearFromDate,
  resolveTaxYearConfig,
} from "@/server/tds/tax-year-config";
import { MONTHS_PER_YEAR } from "@/server/payroll/salary-structure";

export const DEFAULT_MONTHLY_PROFESSIONAL_TAX = 200;

/** Component codes treated as employer non-cash CTC (excluded from cash gross). */
export const NON_CASH_CTC_CODES = new Set([
  "EMPLOYER_PF",
  "EPF_EMPLOYER",
  "GRATUITY",
  "EMPLOYER_ESI",
  "NPS_EMPLOYER",
]);

export type SalaryStructureCalculateInput = {
  annualCtc: number;
  /** Optional override; otherwise annualGrossCash / 12. */
  monthlyGross?: number | null;
  monthlyProfessionalTax?: number | null;
  /** Other monthly payroll deductions already configured (loan, etc.). */
  otherMonthlyDeductions?: number;
  components?: Record<string, number> | null;
  effectiveFrom?: string | Date | null;
  financialYear?: string;
  regime?: "NEW" | "OLD";
  residentialStatus?: "RESIDENT" | "NON_RESIDENT";
  /** YTD TDS already deducted (for remaining allocation). */
  tdsDeductedYtd?: number;
  /** Months of FY already paid (0–11). */
  monthsElapsed?: number;
  previousEmployerIncome?: number;
  previousEmployerTds?: number;
  otherAnnualIncome?: number;
  otherDeductions?: number;
  hasSpecialRateIncome?: boolean;
  /** When set, preserves imported/manual TDS instead of calculated. */
  preserveMonthlyTds?: number | null;
  preserveExpectedNet?: number | null;
};

export type SalaryStructureCalculation = {
  financialYear: string;
  assessmentYear: string;
  regime: "NEW" | "OLD";
  residentialStatus: "RESIDENT" | "NON_RESIDENT";
  annualCtc: number;
  nonCashCtcComponents: number;
  annualGrossCash: number;
  monthlyGross: number;
  monthlyGrossUnrounded: number;
  monthlyRoundingDifference: number;
  indicativeMonthlyTds: number;
  monthlyProfessionalTax: number;
  otherMonthlyDeductions: number;
  expectedMonthlyNetCalculated: number;
  /** Value to persist unless an authorised override is supplied. */
  expectedMonthlyNet: number;
  monthlyTds: number;
  tax: AnnualTaxBreakdown;
  remainingPayrollPeriods: number;
  remainingTdsToCollect: number;
  periodSpecificMonthlyTds: number;
  /** Prior YTD/previous-employer TDS exceeds projected annual liability — payroll review. */
  excessTdsReviewRequired: boolean;
  excessTdsAmount: number;
  comparison?: {
    preservedMonthlyTds: number | null;
    preservedExpectedNet: number | null;
    tdsDelta: number | null;
    netDelta: number | null;
  };
  assumptionBanner: string;
  disclaimer: string;
  ruleSourceUrl: string;
};

export function salaryStructureCalculate(
  input: SalaryStructureCalculateInput,
): SalaryStructureCalculation {
  if (!Number.isFinite(input.annualCtc) || input.annualCtc < 0) {
    throw new Error("Annual CTC must be a non-negative number");
  }

  const effective =
    input.effectiveFrom == null
      ? new Date()
      : input.effectiveFrom instanceof Date
        ? input.effectiveFrom
        : new Date(input.effectiveFrom);
  if (Number.isNaN(effective.getTime())) throw new Error("Invalid effective-from date");

  const fy =
    input.financialYear ?? financialYearFromDate(effective).financialYear;
  const regime = input.regime ?? "NEW";
  const residentialStatus = input.residentialStatus ?? "RESIDENT";
  const config = resolveTaxYearConfig({ financialYear: fy, regime });

  let nonCash = 0;
  for (const [code, amount] of Object.entries(input.components ?? {})) {
    if (NON_CASH_CTC_CODES.has(code.toUpperCase()) && Number.isFinite(amount) && amount > 0) {
      nonCash += amount;
    }
  }
  nonCash = roundPaise(nonCash);
  const annualGrossCash = roundPaise(Math.max(0, input.annualCtc - nonCash));
  const monthlyGrossUnrounded = annualGrossCash / MONTHS_PER_YEAR;
  const monthlyGross =
    input.monthlyGross != null && Number.isFinite(input.monthlyGross)
      ? roundPaise(input.monthlyGross)
      : roundPaise(monthlyGrossUnrounded);
  const monthlyRoundingDifference = roundPaise(monthlyGross * MONTHS_PER_YEAR - annualGrossCash);

  const previousEmployerIncome = Math.max(0, input.previousEmployerIncome ?? 0);
  const otherAnnualIncome = Math.max(0, input.otherAnnualIncome ?? 0);
  const projectedAnnualGross = roundPaise(
    annualGrossCash + previousEmployerIncome + otherAnnualIncome,
  );

  const tax = calculateAnnualIncomeTax({
    config,
    projectedAnnualGross,
    otherDeductions: input.otherDeductions ?? 0,
    residentialStatus,
    hasSpecialRateIncome: input.hasSpecialRateIncome,
  });

  const indicativeMonthlyTds = roundPaise(tax.annualTax / MONTHS_PER_YEAR);
  const monthsElapsed = Math.min(11, Math.max(0, input.monthsElapsed ?? 0));
  const remainingPayrollPeriods = Math.max(1, MONTHS_PER_YEAR - monthsElapsed);
  const tdsDeductedYtd = Math.max(
    0,
    (input.tdsDeductedYtd ?? 0) + (input.previousEmployerTds ?? 0),
  );
  const rawRemainingTds = roundPaise(tax.annualTax - tdsDeductedYtd);
  const excessTdsReviewRequired = rawRemainingTds < 0;
  const excessTdsAmount = excessTdsReviewRequired ? roundPaise(-rawRemainingTds) : 0;
  const remainingTdsToCollect = excessTdsReviewRequired ? 0 : rawRemainingTds;
  const periodSpecificMonthlyTds = roundPaise(remainingTdsToCollect / remainingPayrollPeriods);

  const monthlyTds =
    input.preserveMonthlyTds != null && Number.isFinite(input.preserveMonthlyTds)
      ? roundPaise(input.preserveMonthlyTds)
      : indicativeMonthlyTds;

  const monthlyProfessionalTax =
    input.monthlyProfessionalTax != null && Number.isFinite(input.monthlyProfessionalTax)
      ? roundPaise(input.monthlyProfessionalTax)
      : DEFAULT_MONTHLY_PROFESSIONAL_TAX;

  const otherMonthlyDeductions = roundPaise(Math.max(0, input.otherMonthlyDeductions ?? 0));
  /** Always based on indicative (automatic) TDS — never the preserved override. */
  const expectedMonthlyNetCalculated = roundPaise(
    monthlyGross - indicativeMonthlyTds - monthlyProfessionalTax - otherMonthlyDeductions,
  );
  const expectedMonthlyNet =
    input.preserveExpectedNet != null && Number.isFinite(input.preserveExpectedNet)
      ? roundPaise(input.preserveExpectedNet)
      : expectedMonthlyNetCalculated;

  return {
    financialYear: config.financialYear,
    assessmentYear: config.assessmentYear,
    regime: config.regime,
    residentialStatus,
    annualCtc: roundPaise(input.annualCtc),
    nonCashCtcComponents: nonCash,
    annualGrossCash,
    monthlyGross,
    monthlyGrossUnrounded: roundPaise(monthlyGrossUnrounded),
    monthlyRoundingDifference,
    indicativeMonthlyTds,
    monthlyProfessionalTax,
    otherMonthlyDeductions,
    expectedMonthlyNetCalculated,
    expectedMonthlyNet,
    monthlyTds,
    tax,
    remainingPayrollPeriods,
    remainingTdsToCollect,
    periodSpecificMonthlyTds,
    excessTdsReviewRequired,
    excessTdsAmount,
    comparison:
      input.preserveMonthlyTds != null || input.preserveExpectedNet != null
        ? {
            preservedMonthlyTds: input.preserveMonthlyTds ?? null,
            preservedExpectedNet: input.preserveExpectedNet ?? null,
            tdsDelta:
              input.preserveMonthlyTds != null
                ? roundPaise(input.preserveMonthlyTds - indicativeMonthlyTds)
                : null,
            netDelta:
              input.preserveExpectedNet != null
                ? roundPaise(input.preserveExpectedNet - expectedMonthlyNetCalculated)
                : null,
          }
        : undefined,
    assumptionBanner:
      nonCash > 0
        ? `Simplified salary mode: Annual CTC ₹${input.annualCtc.toLocaleString("en-IN")} minus non-cash employer components ₹${nonCash.toLocaleString("en-IN")} = annual gross cash ₹${annualGrossCash.toLocaleString("en-IN")}.`
        : "Simplified salary mode: Annual CTC is treated as annual gross cash salary (÷ 12 = monthly gross).",
    disclaimer: TDS_DISCLAIMER,
    ruleSourceUrl: config.sourceUrl,
  };
}

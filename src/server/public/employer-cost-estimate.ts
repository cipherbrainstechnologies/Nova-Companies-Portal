import { salaryStructureCalculate } from "@/server/payroll/salary-structure-calculator";
import { roundPaise } from "@/server/tds/tds-engine";
import {
  getIndicativeFxQuote,
  inrToBillingCurrency,
  type BillingCurrency,
  type IndicativeFxQuote,
} from "@/server/public/fx-indicative";
import type { ResolvedPricingPlan } from "@/server/public/pricing-plans";

export const PF_WAGE_CEILING_INR = 15_000;
export const ESI_GROSS_CEILING_INR = 21_000;
export const DEFAULT_BASIC_RATIO = 0.5;

export type CompensationBasis = "GROSS" | "CTC";

export type EmployerCostEstimateInput = {
  compensationBasis: CompensationBasis;
  /** Monthly gross cash or monthly CTC depending on basis. */
  monthlyCompensationInr: number;
  headcount: number;
  stateCode?: string;
  monthlyBenefitsInr?: number;
  billingCurrency: BillingCurrency;
  planCode?: string;
  payrollFrequency?: "MONTHLY" | "ANNUAL_VIEW";
};

export type LineItem = {
  code: string;
  label: string;
  amountInr: number;
  category: "employee_cash" | "employee_deduction" | "employer_statutory" | "benefits" | "service_fee" | "tax" | "fx" | "other";
  formula?: string;
  note?: string;
};

export type PerEmployeeBreakdown = {
  monthlyGrossInr: number;
  lineItems: LineItem[];
  employeeDeductionsInr: number;
  employerStatutoryInr: number;
  benefitsInr: number;
  novaFeeInr: number;
  gstOnFeeInr: number;
  totalMonthlyEmployerCostInr: number;
  totalMonthlyEmployeeNetInr: number;
};

export type EmployerCostEstimateResult = {
  calculatedAtIso: string;
  assumptions: string[];
  disclaimers: string[];
  perEmployee: PerEmployeeBreakdown;
  consolidated: {
    headcount: number;
    monthlyTotalInr: number;
    annualTotalInr: number;
    oneOffOnboardingInr: number;
    monthlyBillingCurrency: number;
    annualBillingCurrency: number;
  };
  fx: IndicativeFxQuote;
  plan: Pick<ResolvedPricingPlan, "code" | "label" | "version">;
  inspectable: {
    basicInr: number;
    pfWageBaseInr: number;
    esiApplicable: boolean;
    professionalTaxInr: number;
    taxDisclaimer: string;
  };
};

function monthlyProfessionalTax(stateCode?: string): number {
  const map: Record<string, number> = {
    MH: 200,
    KA: 200,
    TG: 200,
    TN: 200,
    WB: 200,
  };
  const code = stateCode?.toUpperCase();
  return code && map[code] != null ? map[code] : 200;
}

function employerStatutoryFromGross(monthlyGross: number) {
  const basic = roundPaise(monthlyGross * DEFAULT_BASIC_RATIO);
  const pfWageBase = Math.min(basic, PF_WAGE_CEILING_INR);
  const employeePf = roundPaise(pfWageBase * 0.12);
  const employerPf = roundPaise(pfWageBase * 0.12);
  const esiApplicable = monthlyGross <= ESI_GROSS_CEILING_INR;
  const employeeEsi = esiApplicable ? roundPaise(monthlyGross * 0.0075) : 0;
  const employerEsi = esiApplicable ? roundPaise(monthlyGross * 0.0325) : 0;
  const gratuityProvision = roundPaise((basic * 15) / 26 / 12);
  return {
    basic,
    pfWageBase,
    employeePf,
    employerPf,
    employeeEsi,
    employerEsi,
    gratuityProvision,
    esiApplicable,
  };
}

/** Solve monthly gross when buyer enters monthly CTC (cash + employer statutory accruals). */
export function grossFromMonthlyCtc(monthlyCtc: number): number {
  if (!Number.isFinite(monthlyCtc) || monthlyCtc <= 0) {
    throw new Error("Monthly CTC must be positive");
  }
  let gross = monthlyCtc * 0.82;
  for (let i = 0; i < 24; i++) {
    const stat = employerStatutoryFromGross(gross);
    const employerLoad =
      stat.employerPf + stat.employerEsi + stat.gratuityProvision;
    const next = roundPaise(monthlyCtc - employerLoad);
    if (Math.abs(next - gross) < 0.02) return next;
    gross = next;
  }
  return roundPaise(gross);
}

export function buildEmployerCostEstimate(
  input: EmployerCostEstimateInput,
  plan: ResolvedPricingPlan,
  asOf: Date = new Date(),
): EmployerCostEstimateResult {
  const headcount = Math.min(500, Math.max(1, Math.floor(input.headcount)));
  const monthlyBenefits = roundPaise(Math.max(0, input.monthlyBenefitsInr ?? 0));
  const monthlyComp = roundPaise(input.monthlyCompensationInr);

  if (!Number.isFinite(monthlyComp) || monthlyComp < 5_000 || monthlyComp > 5_000_000) {
    throw new Error("Monthly compensation must be between ₹5,000 and ₹50,00,000");
  }

  const monthlyGross =
    input.compensationBasis === "GROSS"
      ? monthlyComp
      : grossFromMonthlyCtc(monthlyComp);

  const stat = employerStatutoryFromGross(monthlyGross);
  const pt = monthlyProfessionalTax(input.stateCode);

  const annualEmployerPf = stat.employerPf * 12;
  const annualEmployerEsi = stat.employerEsi * 12;
  const annualGratuity = stat.gratuityProvision * 12;
  const annualCtc = roundPaise(
    monthlyGross * 12 + annualEmployerPf + annualEmployerEsi + annualGratuity,
  );

  const taxCalc = salaryStructureCalculate({
    annualCtc,
    monthlyGross,
    monthlyProfessionalTax: pt,
    financialYear: "2025-26",
    effectiveFrom: "2025-08-01",
    components: {
      EMPLOYER_PF: annualEmployerPf,
      EMPLOYER_ESI: annualEmployerEsi,
      GRATUITY: annualGratuity,
    },
  });

  const novaFee = roundPaise(Math.max(0, plan.feePerEmployeeInr));
  const gstOnFee = roundPaise(novaFee * 0.18);

  const employeeDeductions =
    stat.employeePf + stat.employeeEsi + taxCalc.indicativeMonthlyTds + pt;

  const employerStatutory = stat.employerPf + stat.employerEsi + stat.gratuityProvision;

  const totalMonthlyEmployerCost = roundPaise(
    monthlyGross + employerStatutory + monthlyBenefits + novaFee + gstOnFee,
  );

  const totalMonthlyEmployeeNet = roundPaise(monthlyGross - employeeDeductions);

  const lineItems: LineItem[] = [
    {
      code: "GROSS",
      label: "Employee gross salary (cash)",
      amountInr: monthlyGross,
      category: "employee_cash",
      formula: input.compensationBasis === "CTC" ? "Derived from monthly CTC" : "Input",
    },
    {
      code: "EE_PF",
      label: "Employee PF (prov.)",
      amountInr: stat.employeePf,
      category: "employee_deduction",
      formula: `12% × min(basic, ₹${PF_WAGE_CEILING_INR})`,
      note: "Employee deduction — not added to employer total",
    },
    {
      code: "EE_ESI",
      label: "Employee ESI (prov.)",
      amountInr: stat.employeeEsi,
      category: "employee_deduction",
      formula: stat.esiApplicable ? "0.75% × gross" : "Not applicable above ESI ceiling",
    },
    {
      code: "EE_TDS",
      label: "Indicative TDS",
      amountInr: taxCalc.indicativeMonthlyTds,
      category: "employee_deduction",
      note: taxCalc.disclaimer,
    },
    {
      code: "EE_PT",
      label: "Professional tax (prov.)",
      amountInr: pt,
      category: "employee_deduction",
    },
    {
      code: "ER_PF",
      label: "Employer PF (prov.)",
      amountInr: stat.employerPf,
      category: "employer_statutory",
      formula: `12% × min(basic, ₹${PF_WAGE_CEILING_INR})`,
    },
    {
      code: "ER_ESI",
      label: "Employer ESI (prov.)",
      amountInr: stat.employerEsi,
      category: "employer_statutory",
      formula: stat.esiApplicable ? "3.25% × gross" : "Not applicable",
    },
    {
      code: "GRATUITY",
      label: "Gratuity provision (prov.)",
      amountInr: stat.gratuityProvision,
      category: "employer_statutory",
      formula: "(15/26) × basic ÷ 12",
    },
    {
      code: "BENEFITS",
      label: "Benefits & insurance (input)",
      amountInr: monthlyBenefits,
      category: "benefits",
    },
    {
      code: "NOVA_FEE",
      label: "NOVA EOR service fee (indicative)",
      amountInr: novaFee,
      category: "service_fee",
      note: plan.feePerEmployeeInr <= 0
        ? "Fee shown as zero until commercial schedule is configured — confirm in proposal"
        : undefined,
    },
    {
      code: "GST_FEE",
      label: "GST on service fee (indicative 18%)",
      amountInr: gstOnFee,
      category: "tax",
      note: "Treatment confirmed per entity and contract",
    },
  ];

  const fx = getIndicativeFxQuote(input.billingCurrency, asOf);
  const monthlyBilling = roundPaise(inrToBillingCurrency(totalMonthlyEmployerCost, fx) + fx.bankFeeInr / headcount);

  const assumptions = [
    `Basic salary assumed at ${DEFAULT_BASIC_RATIO * 100}% of gross for statutory modelling`,
    `PF wage ceiling ₹${PF_WAGE_CEILING_INR.toLocaleString("en-IN")}; ESI applies when gross ≤ ₹${ESI_GROSS_CEILING_INR.toLocaleString("en-IN")}`,
    taxCalc.assumptionBanner,
    "Statutory figures are provisional pending employing entity, state, and employee review",
  ];

  const disclaimers = [
    "Indicative, non-binding estimate for planning — not an offer of employment or commercial contract",
    taxCalc.disclaimer,
    fx.disclaimer,
  ];

  return {
    calculatedAtIso: asOf.toISOString(),
    assumptions,
    disclaimers,
    perEmployee: {
      monthlyGrossInr: monthlyGross,
      lineItems,
      employeeDeductionsInr: employeeDeductions,
      employerStatutoryInr: employerStatutory,
      benefitsInr: monthlyBenefits,
      novaFeeInr: novaFee,
      gstOnFeeInr: gstOnFee,
      totalMonthlyEmployerCostInr: totalMonthlyEmployerCost,
      totalMonthlyEmployeeNetInr: totalMonthlyEmployeeNet,
    },
    consolidated: {
      headcount,
      monthlyTotalInr: roundPaise(totalMonthlyEmployerCost * headcount),
      annualTotalInr: roundPaise(totalMonthlyEmployerCost * headcount * 12),
      oneOffOnboardingInr: roundPaise(plan.onboardingFeeInr * headcount),
      monthlyBillingCurrency: monthlyBilling,
      annualBillingCurrency: roundPaise(monthlyBilling * 12),
    },
    fx,
    plan: { code: plan.code, label: plan.label, version: plan.version },
    inspectable: {
      basicInr: stat.basic,
      pfWageBaseInr: stat.pfWageBase,
      esiApplicable: stat.esiApplicable,
      professionalTaxInr: pt,
      taxDisclaimer: taxCalc.disclaimer,
    },
  };
}

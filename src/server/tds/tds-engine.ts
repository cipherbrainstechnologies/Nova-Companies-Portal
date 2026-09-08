import { createHash } from "crypto";
import {
  resolveTaxYearConfig,
  type TaxSlabRule,
  type TaxYearConfig,
} from "@/server/tds/tax-year-config";

export const TDS_DISCLAIMER =
  "Estimate only; have a qualified CA review statutory deductions and Form 16.";

/** Round to paise using banker's-friendly half-up to 2 decimals. */
export function roundPaise(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export type SlabTaxLine = {
  from: number;
  to: number | null;
  rate: number;
  taxableInSlab: number;
  tax: number;
};

export function taxFromSlabsDetailed(
  annualTaxable: number,
  slabs: TaxSlabRule[],
): { tax: number; lines: SlabTaxLine[] } {
  let remaining = Math.max(0, annualTaxable);
  let prev = 0;
  let tax = 0;
  const lines: SlabTaxLine[] = [];
  for (const slab of slabs) {
    const ceiling = slab.upTo ?? Number.POSITIVE_INFINITY;
    const width = Math.max(0, Math.min(remaining, ceiling - prev));
    const slabTax = width * slab.rate;
    lines.push({
      from: prev,
      to: slab.upTo,
      rate: slab.rate,
      taxableInSlab: roundPaise(width),
      tax: roundPaise(slabTax),
    });
    tax += slabTax;
    remaining -= width;
    prev = ceiling;
    if (remaining <= 0) break;
  }
  return { tax: roundPaise(tax), lines };
}

/** Legacy helper retained for older TDS projector callers. */
export function taxFromSlabs(annualTaxable: number, slabs: TaxSlabRule[]): number {
  return taxFromSlabsDetailed(annualTaxable, slabs).tax;
}

export type AnnualTaxBreakdown = {
  financialYear: string;
  assessmentYear: string;
  regime: "NEW" | "OLD";
  residentialStatus: "RESIDENT" | "NON_RESIDENT";
  projectedAnnualGross: number;
  standardDeduction: number;
  otherDeductions: number;
  taxableIncome: number;
  taxBySlab: SlabTaxLine[];
  taxBeforeRebate: number;
  rebate: number;
  marginalReliefRebate: number;
  taxAfterRebate: number;
  surcharge: number;
  marginalReliefSurcharge: number;
  taxPlusSurcharge: number;
  cess: number;
  annualTax: number;
  sourceUrl: string;
  verifiedAt: string;
  assumptions: string[];
  unsupportedNotes: string[];
};

function surchargeOn(tax: number, taxable: number, config: TaxYearConfig): number {
  let rate = 0;
  for (const band of [...config.surchargeBands].sort((a, b) => a.above - b.above)) {
    if (taxable > band.above) rate = band.rate;
  }
  return roundPaise(tax * rate);
}

/**
 * Compute annual income-tax liability for normal (slab-rate) income.
 * Special-rate income must be excluded by the caller from taxableIncomeForRebate.
 */
export function calculateAnnualIncomeTax(input: {
  config: TaxYearConfig;
  projectedAnnualGross: number;
  otherDeductions?: number;
  residentialStatus?: "RESIDENT" | "NON_RESIDENT";
  /** When true, §87A rebate is not applied (special-rate income present). */
  hasSpecialRateIncome?: boolean;
}): AnnualTaxBreakdown {
  const residentialStatus = input.residentialStatus ?? "RESIDENT";
  const otherDeductions = Math.max(0, input.otherDeductions ?? 0);
  const std = Math.min(input.config.standardDeduction, Math.max(0, input.projectedAnnualGross));
  const taxableIncome = Math.max(0, roundPaise(input.projectedAnnualGross - std - otherDeductions));
  const { tax: taxBeforeRebate, lines } = taxFromSlabsDetailed(taxableIncome, input.config.slabs);

  let rebate = 0;
  let marginalReliefRebate = 0;
  let taxAfterRebate = taxBeforeRebate;
  const assumptions: string[] = [
    `FY ${input.config.financialYear} / AY ${input.config.assessmentYear} · ${input.config.regime} regime`,
    `Standard deduction limited to eligible salary (capped at ₹${input.config.standardDeduction.toLocaleString("en-IN")})`,
  ];
  const unsupportedNotes: string[] = [];

  const rebateRule = input.config.rebate;
  const canRebate =
    !!rebateRule &&
    residentialStatus === "RESIDENT" &&
    !input.hasSpecialRateIncome;

  if (rebateRule && residentialStatus === "NON_RESIDENT") {
    assumptions.push("§87A rebate not applied — non-resident");
  }
  if (rebateRule && input.hasSpecialRateIncome) {
    assumptions.push("§87A rebate not applied — special-rate income present");
  }

  if (canRebate && rebateRule) {
    if (taxableIncome <= rebateRule.maxTaxableIncome) {
      rebate = Math.min(rebateRule.maxAmount, taxBeforeRebate);
      taxAfterRebate = roundPaise(taxBeforeRebate - rebate);
      assumptions.push(
        `§87A rebate ₹${rebate.toLocaleString("en-IN")} (taxable ≤ ₹${rebateRule.maxTaxableIncome.toLocaleString("en-IN")})`,
      );
    } else {
      // Marginal relief just above the rebate threshold: tax should not exceed the
      // excess of taxable income over the rebate limit (when that is lower).
      const excess = taxableIncome - rebateRule.maxTaxableIncome;
      if (taxBeforeRebate > excess) {
        marginalReliefRebate = roundPaise(taxBeforeRebate - excess);
        taxAfterRebate = roundPaise(excess);
        assumptions.push(
          `Marginal relief on §87A threshold — tax limited to income above ₹${rebateRule.maxTaxableIncome.toLocaleString("en-IN")}`,
        );
      }
    }
  }

  let surcharge = surchargeOn(taxAfterRebate, taxableIncome, input.config);
  let marginalReliefSurcharge = 0;
  // Surcharge marginal relief: tax+surcharge at income I must not exceed
  // tax at threshold T by more than (I − T).
  const sortedBands = [...input.config.surchargeBands].sort((a, b) => a.above - b.above);
  for (let i = sortedBands.length - 1; i >= 0; i -= 1) {
    const band = sortedBands[i];
    if (taxableIncome <= band.above) continue;
    const { tax: taxAtThreshold } = taxFromSlabsDetailed(band.above, input.config.slabs);
    const excessIncome = taxableIncome - band.above;
    const capped = taxAtThreshold + excessIncome;
    const withSurcharge = taxAfterRebate + surcharge;
    if (withSurcharge > capped) {
      marginalReliefSurcharge = roundPaise(withSurcharge - capped);
      surcharge = roundPaise(Math.max(0, surcharge - marginalReliefSurcharge));
      assumptions.push(
        `Surcharge marginal relief applied at ₹${band.above.toLocaleString("en-IN")} threshold`,
      );
    }
    break;
  }

  const taxPlusSurcharge = roundPaise(taxAfterRebate + surcharge);
  const cess = roundPaise(taxPlusSurcharge * input.config.cessRate);
  const annualTax = roundPaise(taxPlusSurcharge + cess);

  if (input.config.regime === "OLD" && otherDeductions === 0) {
    unsupportedNotes.push(
      "Old-regime Chapter VI-A deductions (80C/80D/HRA/etc.) were not supplied — tax may be overstated.",
    );
  }

  return {
    financialYear: input.config.financialYear,
    assessmentYear: input.config.assessmentYear,
    regime: input.config.regime,
    residentialStatus,
    projectedAnnualGross: roundPaise(input.projectedAnnualGross),
    standardDeduction: roundPaise(std),
    otherDeductions: roundPaise(otherDeductions),
    taxableIncome,
    taxBySlab: lines,
    taxBeforeRebate: roundPaise(taxBeforeRebate),
    rebate: roundPaise(rebate),
    marginalReliefRebate: roundPaise(marginalReliefRebate),
    taxAfterRebate: roundPaise(taxAfterRebate),
    surcharge: roundPaise(surcharge),
    marginalReliefSurcharge: roundPaise(marginalReliefSurcharge),
    taxPlusSurcharge,
    cess,
    annualTax,
    sourceUrl: input.config.sourceUrl,
    verifiedAt: input.config.verifiedAt,
    assumptions,
    unsupportedNotes,
  };
}

/** @deprecated Prefer calculateAnnualIncomeTax + salaryStructureCalculate. Kept for /api/tds/project. */
export type TaxFyConfig = {
  slabs: TaxSlabRule[];
  standardDeduction?: number;
};

export function calculateTdsProjection(input: {
  monthlyTaxableComponents: number;
  monthsElapsed: number;
  deductedYtd: number;
  config: TaxFyConfig;
  regime: "OLD" | "NEW";
  financialYear?: string;
  residentialStatus?: "RESIDENT" | "NON_RESIDENT";
}) {
  const financialYear = input.financialYear ?? "2025-26";
  let annual: AnnualTaxBreakdown;
  try {
    const config = resolveTaxYearConfig({ financialYear, regime: input.regime });
    annual = calculateAnnualIncomeTax({
      config,
      projectedAnnualGross: input.monthlyTaxableComponents * 12,
      residentialStatus: input.residentialStatus,
    });
  } catch {
    // Fallback for ad-hoc configs passed by the TDS calculator UI.
    const taxable = Math.max(
      0,
      input.monthlyTaxableComponents * 12 - (input.config.standardDeduction ?? 0),
    );
    const tax = taxFromSlabs(taxable, input.config.slabs);
    annual = {
      financialYear,
      assessmentYear: "",
      regime: input.regime,
      residentialStatus: input.residentialStatus ?? "RESIDENT",
      projectedAnnualGross: input.monthlyTaxableComponents * 12,
      standardDeduction: input.config.standardDeduction ?? 0,
      otherDeductions: 0,
      taxableIncome: taxable,
      taxBySlab: [],
      taxBeforeRebate: tax,
      rebate: 0,
      marginalReliefRebate: 0,
      taxAfterRebate: tax,
      surcharge: 0,
      marginalReliefSurcharge: 0,
      taxPlusSurcharge: tax,
      cess: roundPaise(tax * 0.04),
      annualTax: roundPaise(tax * 1.04),
      sourceUrl: "",
      verifiedAt: "",
      assumptions: ["Ad-hoc slab config (no versioned FY registry entry)"],
      unsupportedNotes: [],
    };
  }

  const remainingMonths = Math.max(1, 12 - input.monthsElapsed);
  const remainingTax = Math.max(0, annual.annualTax - input.deductedYtd);
  const monthlyTds = roundPaise(remainingTax / remainingMonths);

  return {
    regime: input.regime,
    projectedAnnualTaxable: annual.taxableIncome,
    projectedAnnualTax: annual.annualTax,
    monthlyTds,
    deductedYtd: input.deductedYtd,
    remaining: remainingTax,
    disclaimer: TDS_DISCLAIMER,
    assumptions: {
      monthlyTaxableComponents: input.monthlyTaxableComponents,
      standardDeduction: annual.standardDeduction,
      monthsElapsed: input.monthsElapsed,
      breakdown: annual,
    },
  };
}

export function configFingerprint(config: TaxFyConfig): string {
  return createHash("sha256").update(JSON.stringify(config)).digest("hex").slice(0, 12);
}

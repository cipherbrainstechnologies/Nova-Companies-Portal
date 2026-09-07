import { createHash } from "crypto";

export type TaxSlab = { upTo: number | null; rate: number };

export type TaxFyConfig = {
  slabs: TaxSlab[];
  standardDeduction?: number;
};

export const TDS_DISCLAIMER =
  "Estimate only; have a qualified CA review statutory deductions and Form 16.";

export function taxFromSlabs(annualTaxable: number, slabs: TaxSlab[]): number {
  let remaining = Math.max(0, annualTaxable);
  let prev = 0;
  let tax = 0;
  for (const slab of slabs) {
    const ceiling = slab.upTo ?? Number.POSITIVE_INFINITY;
    const width = Math.max(0, Math.min(remaining, ceiling - prev));
    tax += width * slab.rate;
    remaining -= width;
    prev = ceiling;
    if (remaining <= 0) break;
  }
  return Math.round(tax);
}

export function calculateTdsProjection(input: {
  monthlyTaxableComponents: number;
  monthsElapsed: number;
  deductedYtd: number;
  config: TaxFyConfig;
  regime: "OLD" | "NEW";
}) {
  const annualGross = input.monthlyTaxableComponents * 12;
  const std = input.config.standardDeduction ?? 0;
  const annualTaxable = Math.max(0, annualGross - std);
  const annualTax = taxFromSlabs(annualTaxable, input.config.slabs);
  const remainingMonths = Math.max(1, 12 - input.monthsElapsed);
  const remainingTax = Math.max(0, annualTax - input.deductedYtd);
  const monthlyTds = Math.round(remainingTax / remainingMonths);

  return {
    regime: input.regime,
    projectedAnnualTaxable: annualTaxable,
    projectedAnnualTax: annualTax,
    monthlyTds,
    deductedYtd: input.deductedYtd,
    remaining: remainingTax,
    disclaimer: TDS_DISCLAIMER,
    assumptions: {
      monthlyTaxableComponents: input.monthlyTaxableComponents,
      standardDeduction: std,
      monthsElapsed: input.monthsElapsed,
    },
  };
}

export function configFingerprint(config: TaxFyConfig): string {
  return createHash("sha256").update(JSON.stringify(config)).digest("hex").slice(0, 12);
}

/**
 * Versioned Indian salary-TDS tax year configurations.
 * Rules are never silently swapped across financial years.
 *
 * Sources (verify before enabling a new FY):
 * - https://www.incometax.gov.in/iec/foportal/help/individual/return-applicable-1
 * - https://www.incometaxindia.gov.in/w/threshold-limits-under-income-tax-act
 */

export type TaxSlabRule = {
  /** Inclusive upper bound of the slab; null = open-ended. */
  upTo: number | null;
  /** Rate as a fraction (0.05 = 5%). Applied only to income within the slab. */
  rate: number;
};

export type RebateRule = {
  maxAmount: number;
  maxTaxableIncome: number;
};

export type SurchargeBand = {
  above: number;
  rate: number;
};

export type TaxYearConfig = {
  financialYear: string;
  assessmentYear: string;
  regime: "NEW" | "OLD";
  slabs: TaxSlabRule[];
  standardDeduction: number;
  rebate: RebateRule | null;
  cessRate: number;
  surchargeBands: SurchargeBand[];
  sourceUrl: string;
  verifiedAt: string;
  notes: string;
  /** When false, callers must refuse calculation rather than guessing. */
  enabled: boolean;
};

/** FY 2025–26 / AY 2026–27 — new regime (default), verified against ITD help pages. */
export const TAX_FY_2025_26_NEW: TaxYearConfig = {
  financialYear: "2025-26",
  assessmentYear: "2026-27",
  regime: "NEW",
  slabs: [
    { upTo: 400_000, rate: 0 },
    { upTo: 800_000, rate: 0.05 },
    { upTo: 1_200_000, rate: 0.1 },
    { upTo: 1_600_000, rate: 0.15 },
    { upTo: 2_000_000, rate: 0.2 },
    { upTo: 2_400_000, rate: 0.25 },
    { upTo: null, rate: 0.3 },
  ],
  standardDeduction: 75_000,
  rebate: { maxAmount: 60_000, maxTaxableIncome: 1_200_000 },
  cessRate: 0.04,
  surchargeBands: [
    { above: 5_000_000, rate: 0.1 },
    { above: 10_000_000, rate: 0.15 },
    { above: 20_000_000, rate: 0.25 },
  ],
  sourceUrl: "https://www.incometax.gov.in/iec/foportal/help/individual/return-applicable-1",
  verifiedAt: "2026-09-09",
  notes:
    "New regime u/s 115BAC for AY 2026-27. §87A rebate up to ₹60,000 when taxable income ≤ ₹12,00,000 (residents; normal-rate income). Health & education cess 4%. PT is not deducted from taxable income under the new regime.",
  enabled: true,
};

/** FY 2025–26 / AY 2026–27 — old regime (below age 60 individual). */
export const TAX_FY_2025_26_OLD: TaxYearConfig = {
  financialYear: "2025-26",
  assessmentYear: "2026-27",
  regime: "OLD",
  slabs: [
    { upTo: 250_000, rate: 0 },
    { upTo: 500_000, rate: 0.05 },
    { upTo: 1_000_000, rate: 0.2 },
    { upTo: null, rate: 0.3 },
  ],
  standardDeduction: 50_000,
  rebate: { maxAmount: 12_500, maxTaxableIncome: 500_000 },
  cessRate: 0.04,
  surchargeBands: [
    { above: 5_000_000, rate: 0.1 },
    { above: 10_000_000, rate: 0.15 },
    { above: 20_000_000, rate: 0.25 },
    { above: 50_000_000, rate: 0.37 },
  ],
  sourceUrl: "https://www.incometax.gov.in/iec/foportal/help/individual/return-applicable-1",
  verifiedAt: "2026-09-09",
  notes:
    "Old regime AY 2026-27 for individuals below 60. Chapter VI-A deductions are not auto-applied here — pass them as otherDeductions when known. §87A rebate ₹12,500 when taxable ≤ ₹5,00,000.",
  enabled: true,
};

/** FY 2026–27 is intentionally disabled until separately verified against official sources. */
export const TAX_FY_2026_27_NEW_DISABLED: TaxYearConfig = {
  ...TAX_FY_2025_26_NEW,
  financialYear: "2026-27",
  assessmentYear: "2027-28",
  enabled: false,
  notes: "Not enabled — verify official FY 2026-27 rules before use. No silent fallback to FY 2025-26.",
  verifiedAt: "",
};

const REGISTRY: TaxYearConfig[] = [
  TAX_FY_2025_26_NEW,
  TAX_FY_2025_26_OLD,
  TAX_FY_2026_27_NEW_DISABLED,
];

/**
 * Indian FY from a calendar date (UTC): Apr–Mar.
 * January 2026 → FY 2025-26 / AY 2026-27.
 */
export function financialYearFromDate(date: Date): { financialYear: string; assessmentYear: string } {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const start = month >= 4 ? year : year - 1;
  return {
    financialYear: `${start}-${String(start + 1).slice(-2)}`,
    assessmentYear: `${start + 1}-${String(start + 2).slice(-2)}`,
  };
}

export function resolveTaxYearConfig(input: {
  financialYear: string;
  regime: "NEW" | "OLD";
}): TaxYearConfig {
  const found = REGISTRY.find(
    (row) => row.financialYear === input.financialYear && row.regime === input.regime,
  );
  if (!found) {
    throw new Error(
      `No tax configuration for FY ${input.financialYear} (${input.regime}). Missing years are not substituted.`,
    );
  }
  if (!found.enabled) {
    throw new Error(
      `Tax configuration for FY ${input.financialYear} (${input.regime}) is not enabled pending official verification.`,
    );
  }
  return found;
}

export function listEnabledTaxYears(): Array<{ financialYear: string; assessmentYear: string; regime: "NEW" | "OLD" }> {
  return REGISTRY.filter((row) => row.enabled).map((row) => ({
    financialYear: row.financialYear,
    assessmentYear: row.assessmentYear,
    regime: row.regime,
  }));
}

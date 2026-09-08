import { describe, expect, it } from "vitest";
import {
  calculateAnnualIncomeTax,
  roundPaise,
} from "../src/server/tds/tds-engine";
import {
  financialYearFromDate,
  resolveTaxYearConfig,
  TAX_FY_2025_26_NEW,
} from "../src/server/tds/tax-year-config";
import { salaryStructureCalculate } from "../src/server/payroll/salary-structure-calculator";

describe("FY mapping", () => {
  it("maps January 2026 to FY 2025-26 / AY 2026-27", () => {
    const fy = financialYearFromDate(new Date("2026-01-15T00:00:00.000Z"));
    expect(fy.financialYear).toBe("2025-26");
    expect(fy.assessmentYear).toBe("2026-27");
  });

  it("maps April 2025 to FY 2025-26", () => {
    expect(financialYearFromDate(new Date("2025-04-01T00:00:00.000Z")).financialYear).toBe(
      "2025-26",
    );
  });

  it("maps March 2025 to FY 2024-25", () => {
    expect(financialYearFromDate(new Date("2025-03-31T00:00:00.000Z")).financialYear).toBe(
      "2024-25",
    );
  });
});

describe("tax year registry", () => {
  it("refuses missing FY without fallback", () => {
    expect(() => resolveTaxYearConfig({ financialYear: "2024-25", regime: "NEW" })).toThrow(
      /not substituted|No tax configuration/i,
    );
  });

  it("refuses disabled FY 2026-27", () => {
    expect(() => resolveTaxYearConfig({ financialYear: "2026-27", regime: "NEW" })).toThrow(
      /not enabled/i,
    );
  });

  it("does not apply 2025-26 config when FY is missing", () => {
    expect(() => resolveTaxYearConfig({ financialYear: "2024-25", regime: "OLD" })).toThrow();
  });
});

describe("FY 2025-26 new-regime salary structure (user cases A/B)", () => {
  it("A: ₹6,00,000 → monthly gross 50,000, TDS 0, net 49,800", () => {
    const calc = salaryStructureCalculate({
      annualCtc: 600_000,
      financialYear: "2025-26",
      regime: "NEW",
      residentialStatus: "RESIDENT",
      monthlyProfessionalTax: 200,
      effectiveFrom: "2025-04-01",
    });
    expect(calc.monthlyGross).toBe(50_000);
    expect(calc.indicativeMonthlyTds).toBe(0);
    expect(calc.tax.annualTax).toBe(0);
    expect(calc.expectedMonthlyNetCalculated).toBe(49_800);
  });

  it("B: ₹12,75,000 → gross 1,06,250, taxable 12L, tax 0 after rebate, net 1,06,050", () => {
    const calc = salaryStructureCalculate({
      annualCtc: 1_275_000,
      financialYear: "2025-26",
      regime: "NEW",
      residentialStatus: "RESIDENT",
      monthlyProfessionalTax: 200,
      effectiveFrom: "2025-04-01",
    });
    expect(calc.monthlyGross).toBe(106_250);
    expect(calc.tax.taxableIncome).toBe(1_200_000);
    expect(calc.tax.rebate).toBe(60_000);
    expect(calc.tax.annualTax).toBe(0);
    expect(calc.indicativeMonthlyTds).toBe(0);
    expect(calc.expectedMonthlyNetCalculated).toBe(106_050);
  });
});

describe("FY 2025-26 new-regime tax edges", () => {
  const config = TAX_FY_2025_26_NEW;

  it("applies slab rates only within each band at ₹12L taxable boundary", () => {
    const tax = calculateAnnualIncomeTax({
      config,
      projectedAnnualGross: 1_275_000,
      residentialStatus: "RESIDENT",
    });
    // 4L@0 + 4L@5% + 4L@10% = 60_000 before rebate
    expect(tax.taxBeforeRebate).toBe(60_000);
    expect(tax.rebate).toBe(60_000);
    expect(tax.annualTax).toBe(0);
  });

  it("applies marginal relief just above the §87A threshold", () => {
    // Taxable slightly above 12L: gross = 12L + 75k + 1 = 12,75,001
    const tax = calculateAnnualIncomeTax({
      config,
      projectedAnnualGross: 1_275_001,
      residentialStatus: "RESIDENT",
    });
    expect(tax.taxableIncome).toBe(1_200_001);
    expect(tax.rebate).toBe(0);
    expect(tax.marginalReliefRebate).toBeGreaterThan(0);
    // Tax limited to excess over 12L (=1) before cess, then +4% cess
    expect(tax.taxAfterRebate).toBe(1);
    expect(tax.annualTax).toBe(roundPaise(1 * 1.04));
  });

  it("excludes non-residents from §87A rebate", () => {
    const resident = calculateAnnualIncomeTax({
      config,
      projectedAnnualGross: 600_000,
      residentialStatus: "RESIDENT",
    });
    const nonResident = calculateAnnualIncomeTax({
      config,
      projectedAnnualGross: 600_000,
      residentialStatus: "NON_RESIDENT",
    });
    expect(resident.annualTax).toBe(0);
    expect(nonResident.rebate).toBe(0);
    expect(nonResident.annualTax).toBeGreaterThan(0);
  });

  it("does not apply rebate when special-rate income is flagged", () => {
    const tax = calculateAnnualIncomeTax({
      config,
      projectedAnnualGross: 600_000,
      residentialStatus: "RESIDENT",
      hasSpecialRateIncome: true,
    });
    expect(tax.rebate).toBe(0);
    expect(tax.annualTax).toBeGreaterThan(0);
  });

  it("does not subtract professional tax from taxable income (new regime)", () => {
    const withPtInGrossOnly = salaryStructureCalculate({
      annualCtc: 1_275_000,
      financialYear: "2025-26",
      regime: "NEW",
      monthlyProfessionalTax: 200,
    });
    // Taxable remains 12L — PT only reduces take-home
    expect(withPtInGrossOnly.tax.taxableIncome).toBe(1_200_000);
    expect(withPtInGrossOnly.expectedMonthlyNetCalculated).toBe(
      withPtInGrossOnly.monthlyGross -
        withPtInGrossOnly.indicativeMonthlyTds -
        withPtInGrossOnly.monthlyProfessionalTax,
    );
  });
});

describe("old regime is separate", () => {
  it("uses old slabs / std deduction / rebate — not new-regime thresholds", () => {
    const neu = salaryStructureCalculate({
      annualCtc: 600_000,
      financialYear: "2025-26",
      regime: "NEW",
      residentialStatus: "RESIDENT",
    });
    const old = salaryStructureCalculate({
      annualCtc: 600_000,
      financialYear: "2025-26",
      regime: "OLD",
      residentialStatus: "RESIDENT",
    });
    expect(old.tax.standardDeduction).toBe(50_000);
    expect(neu.tax.standardDeduction).toBe(75_000);
    // Old: taxable 5.5L → tax before rebate; rebate only if taxable ≤ 5L so no full wipe
    expect(old.tax.taxableIncome).toBe(550_000);
    expect(old.tax.rebate).toBe(0);
    expect(old.tax.annualTax).toBeGreaterThan(0);
    expect(neu.tax.annualTax).toBe(0);
  });
});

describe("mid-year / prior employer / rounding / preserve", () => {
  it("allocates remaining TDS across remaining periods after YTD", () => {
    const calc = salaryStructureCalculate({
      annualCtc: 2_400_000,
      financialYear: "2025-26",
      regime: "NEW",
      monthsElapsed: 6,
      tdsDeductedYtd: 50_000,
    });
    expect(calc.remainingPayrollPeriods).toBe(6);
    expect(calc.remainingTdsToCollect).toBe(
      roundPaise(Math.max(0, calc.tax.annualTax - 50_000)),
    );
    expect(calc.periodSpecificMonthlyTds).toBe(
      roundPaise(calc.remainingTdsToCollect / 6),
    );
    // Indicative stays annual/12; period-specific differs when YTD exists
    expect(calc.indicativeMonthlyTds).not.toBe(calc.periodSpecificMonthlyTds);
  });

  it("flags excess prior TDS for review instead of negative deduction", () => {
    const calc = salaryStructureCalculate({
      annualCtc: 600_000,
      financialYear: "2025-26",
      regime: "NEW",
      tdsDeductedYtd: 10_000,
      previousEmployerTds: 5_000,
    });
    expect(calc.tax.annualTax).toBe(0);
    expect(calc.excessTdsReviewRequired).toBe(true);
    expect(calc.excessTdsAmount).toBe(15_000);
    expect(calc.periodSpecificMonthlyTds).toBe(0);
  });

  it("includes previous employer income in projected annual gross once", () => {
    const calc = salaryStructureCalculate({
      annualCtc: 600_000,
      previousEmployerIncome: 300_000,
      previousEmployerTds: 5_000,
      financialYear: "2025-26",
      regime: "NEW",
    });
    expect(calc.tax.projectedAnnualGross).toBe(900_000);
    expect(calc.remainingTdsToCollect).toBe(
      roundPaise(Math.max(0, calc.tax.annualTax - 5_000)),
    );
  });

  it("preserves annual CTC when monthly gross has rounding residue", () => {
    const calc = salaryStructureCalculate({
      annualCtc: 2_912_000,
      financialYear: "2025-26",
      regime: "NEW",
    });
    expect(calc.annualCtc).toBe(2_912_000);
    expect(calc.monthlyGross * 12).not.toBe(2_912_000);
    expect(calc.monthlyRoundingDifference).not.toBe(0);
    expect(
      roundPaise(
        calc.monthlyGross -
          calc.indicativeMonthlyTds -
          calc.monthlyProfessionalTax,
      ),
    ).toBe(calc.expectedMonthlyNetCalculated);
  });

  it("deducts non-cash employer CTC components from cash gross", () => {
    const calc = salaryStructureCalculate({
      annualCtc: 720_000,
      components: { EMPLOYER_PF: 21_600, BASIC: 600_000 },
      financialYear: "2025-26",
      regime: "NEW",
    });
    expect(calc.annualGrossCash).toBe(698_400);
    expect(calc.monthlyGross).toBe(roundPaise(698_400 / 12));
  });

  it("preserves imported TDS/net for comparison without overwriting", () => {
    const calc = salaryStructureCalculate({
      annualCtc: 600_000,
      financialYear: "2025-26",
      regime: "NEW",
      preserveMonthlyTds: 1_000,
      preserveExpectedNet: 48_000,
    });
    expect(calc.monthlyTds).toBe(1_000);
    expect(calc.expectedMonthlyNet).toBe(48_000);
    expect(calc.indicativeMonthlyTds).toBe(0);
    expect(calc.expectedMonthlyNetCalculated).toBe(49_800);
    expect(calc.comparison?.tdsDelta).toBe(1_000);
    expect(calc.comparison?.netDelta).toBe(roundPaise(48_000 - 49_800));
  });
});

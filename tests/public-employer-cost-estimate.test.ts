import { describe, expect, it } from "vitest";
import {
  buildEmployerCostEstimate,
  grossFromMonthlyCtc,
  PF_WAGE_CEILING_INR,
  ESI_GROSS_CEILING_INR,
} from "../src/server/public/employer-cost-estimate";
import type { ResolvedPricingPlan } from "../src/server/public/pricing-plans";
import { inrToBillingCurrency, getIndicativeFxQuote } from "../src/server/public/fx-indicative";

const plan: ResolvedPricingPlan = {
  code: "standard",
  label: "Test plan",
  feePerEmployeeInr: 12_000,
  onboardingFeeInr: 5_000,
  version: 1,
};

function estimate(monthly: number, overrides: Partial<Parameters<typeof buildEmployerCostEstimate>[0]> = {}) {
  return buildEmployerCostEstimate(
    {
      compensationBasis: "GROSS",
      monthlyCompensationInr: monthly,
      headcount: 1,
      billingCurrency: "INR",
      ...overrides,
    },
    plan,
    new Date("2026-10-11T12:00:00.000Z"),
  );
}

describe("grossFromMonthlyCtc", () => {
  it("returns lower gross than CTC", () => {
    const gross = grossFromMonthlyCtc(100_000);
    expect(gross).toBeLessThan(100_000);
    expect(gross).toBeGreaterThan(70_000);
  });

  it("rejects non-positive CTC", () => {
    expect(() => grossFromMonthlyCtc(0)).toThrow();
  });
});

describe("buildEmployerCostEstimate", () => {
  it("computes employer total as gross + statutory + fee + gst + benefits", () => {
    const r = estimate(100_000, { monthlyBenefitsInr: 2_500 });
    const { perEmployee } = r;
    expect(perEmployee.totalMonthlyEmployerCostInr).toBeGreaterThan(perEmployee.monthlyGrossInr);
    expect(perEmployee.benefitsInr).toBe(2_500);
    expect(perEmployee.novaFeeInr).toBe(12_000);
    expect(perEmployee.gstOnFeeInr).toBe(2_160);
  });

  it("does not add employee deductions to employer total", () => {
    const r = estimate(80_000);
    expect(r.perEmployee.employeeDeductionsInr).toBeGreaterThan(0);
    expect(r.perEmployee.totalMonthlyEmployerCostInr).toBeLessThan(
      r.perEmployee.monthlyGrossInr + r.perEmployee.employeeDeductionsInr + 50_000,
    );
  });

  it("scales consolidated totals by headcount", () => {
    const r = estimate(90_000, { headcount: 4 });
    expect(r.consolidated.headcount).toBe(4);
    expect(r.consolidated.monthlyTotalInr).toBe(r.perEmployee.totalMonthlyEmployerCostInr * 4);
    expect(r.consolidated.oneOffOnboardingInr).toBe(5_000 * 4);
  });

  it("applies ESI only under ceiling", () => {
    const low = estimate(20_000);
    const high = estimate(25_000);
    expect(low.inspectable.esiApplicable).toBe(true);
    expect(high.inspectable.esiApplicable).toBe(false);
    const erEsiLow = low.perEmployee.lineItems.find((l) => l.code === "ER_ESI")!.amountInr;
    const erEsiHigh = high.perEmployee.lineItems.find((l) => l.code === "ER_ESI")!.amountInr;
    expect(erEsiLow).toBeGreaterThan(0);
    expect(erEsiHigh).toBe(0);
  });

  it("caps PF wage base", () => {
    const r = estimate(200_000);
    expect(r.inspectable.pfWageBaseInr).toBe(PF_WAGE_CEILING_INR);
  });

  it("rejects compensation below minimum", () => {
    expect(() => estimate(1_000)).toThrow();
  });

  it("rejects compensation above maximum", () => {
    expect(() => estimate(6_000_000)).toThrow();
  });

  it("supports CTC basis", () => {
    const gross = estimate(100_000);
    const ctc = buildEmployerCostEstimate(
      {
        compensationBasis: "CTC",
        monthlyCompensationInr: 100_000,
        headcount: 1,
        billingCurrency: "INR",
      },
      plan,
    );
    expect(ctc.perEmployee.monthlyGrossInr).toBeLessThan(100_000);
    expect(ctc.perEmployee.totalMonthlyEmployerCostInr).toBeGreaterThan(gross.perEmployee.totalMonthlyEmployerCostInr * 0.9);
  });

  it("includes inspectable assumptions and disclaimers", () => {
    const r = estimate(75_000);
    expect(r.assumptions.length).toBeGreaterThan(2);
    expect(r.disclaimers.some((d) => d.toLowerCase().includes("non-binding"))).toBe(true);
  });

  it("computes annual view as 12x monthly team total", () => {
    const r = estimate(60_000, { headcount: 2 });
    expect(r.consolidated.annualTotalInr).toBe(r.consolidated.monthlyTotalInr * 12);
  });

  it("uses zero fee when plan fee is zero", () => {
    const r = buildEmployerCostEstimate(
      {
        compensationBasis: "GROSS",
        monthlyCompensationInr: 50_000,
        headcount: 1,
        billingCurrency: "INR",
      },
      { ...plan, feePerEmployeeInr: 0 },
    );
    expect(r.perEmployee.novaFeeInr).toBe(0);
    expect(r.perEmployee.gstOnFeeInr).toBe(0);
  });

  it("marks gratuity as employer statutory", () => {
    const r = estimate(55_000);
    const gratuity = r.perEmployee.lineItems.find((l) => l.code === "GRATUITY")!;
    expect(gratuity.category).toBe("employer_statutory");
    expect(gratuity.amountInr).toBeGreaterThan(0);
  });

  it("respects state professional tax default", () => {
    const r = estimate(70_000, { stateCode: "MH" });
    expect(r.inspectable.professionalTaxInr).toBe(200);
  });

  it("converts INR totals to billing currency with spread", () => {
    const r = estimate(100_000, { billingCurrency: "USD", headcount: 1 });
    expect(r.fx.billingCurrency).toBe("USD");
    expect(r.consolidated.monthlyBillingCurrency).toBeGreaterThan(0);
    const manual = inrToBillingCurrency(r.consolidated.monthlyTotalInr, r.fx);
    expect(r.consolidated.monthlyBillingCurrency).toBeGreaterThanOrEqual(manual * 0.99);
  });

  it("does not double-count gratuity in employee deductions", () => {
    const r = estimate(65_000);
    const deductionCodes = r.perEmployee.lineItems
      .filter((l) => l.category === "employee_deduction")
      .map((l) => l.code);
    expect(deductionCodes).not.toContain("GRATUITY");
  });

  it("employee net is gross minus deductions", () => {
    const r = estimate(88_000);
    expect(r.perEmployee.totalMonthlyEmployeeNetInr).toBeLessThan(r.perEmployee.monthlyGrossInr);
    expect(r.perEmployee.totalMonthlyEmployeeNetInr).toBe(
      r.perEmployee.monthlyGrossInr - r.perEmployee.employeeDeductionsInr,
    );
  });

  it("headcount is clamped to 500", () => {
    const r = estimate(50_000, { headcount: 900 });
    expect(r.consolidated.headcount).toBe(500);
  });

  it("headcount minimum is 1", () => {
    const r = estimate(50_000, { headcount: 0 });
    expect(r.consolidated.headcount).toBe(1);
  });

  it("ESI ceiling constant matches product rule", () => {
    expect(ESI_GROSS_CEILING_INR).toBe(21_000);
  });

  it("fx quote for INR is 1:1", () => {
    const q = getIndicativeFxQuote("INR");
    expect(q.inrPerUnit).toBe(1);
  });
});

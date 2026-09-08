import { describe, expect, it } from "vitest";
import {
  evaluateEmploymentEligibility,
  paymentSearchWindow,
  payrollPeriodBounds,
  selectEffectiveSalaryStructure,
  summarizePopulateReason,
} from "@/server/payroll/period-eligibility";

const jan2026 = payrollPeriodBounds(2026, 1);

describe("payroll period eligibility", () => {
  it("includes employees employed during January 2026", () => {
    expect(
      evaluateEmploymentEligibility(
        { id: "1", dateOfJoining: "2025-06-01", status: "ACTIVE" },
        jan2026,
      ).eligible,
    ).toBe(true);
  });

  it("excludes employees joining after January", () => {
    const result = evaluateEmploymentEligibility(
      { id: "1", dateOfJoining: "2026-02-01", status: "ACTIVE" },
      jan2026,
    );
    expect(result).toEqual({ eligible: false, reason: "joined_after_period" });
  });

  it("includes later-exited employees for their eligible historical month", () => {
    expect(
      evaluateEmploymentEligibility(
        {
          id: "1",
          dateOfJoining: "2024-01-01",
          dateOfExit: "2026-03-15",
          status: "EXITED",
        },
        jan2026,
      ).eligible,
    ).toBe(true);
  });

  it("excludes employees who exited before the month", () => {
    expect(
      evaluateEmploymentEligibility(
        {
          id: "1",
          dateOfJoining: "2024-01-01",
          dateOfExit: "2025-12-31",
          status: "EXITED",
        },
        jan2026,
      ),
    ).toEqual({ eligible: false, reason: "exited_before_period" });
  });

  it("does not treat login BLOCKED or missing contacts as ineligible", () => {
    expect(
      evaluateEmploymentEligibility(
        { id: "1", dateOfJoining: "2025-01-01", status: "BLOCKED" },
        jan2026,
      ).eligible,
    ).toBe(true);
    expect(
      evaluateEmploymentEligibility(
        { id: "2", dateOfJoining: "2025-01-01", status: "CONTACT_DETAILS_REQUIRED" },
        jan2026,
      ).eligible,
    ).toBe(true);
  });
});

describe("effective salary structure for a payroll month", () => {
  it("does not apply today's structure retrospectively to January", () => {
    const result = selectEffectiveSalaryStructure({
      period: jan2026,
      current: {
        version: 2,
        effectiveFrom: "2026-09-01",
        monthlyGross: 50000,
        expectedMonthlyNet: 45000,
      },
      versions: [
        {
          version: 1,
          effectiveFrom: "2026-09-01",
          monthlyGross: 50000,
          expectedMonthlyNet: 45000,
        },
      ],
    });
    expect(result.status).toBe("missing_historical");
  });

  it("uses the version that covered January", () => {
    const result = selectEffectiveSalaryStructure({
      period: jan2026,
      current: {
        version: 2,
        effectiveFrom: "2026-03-01",
        monthlyGross: 60000,
        expectedMonthlyNet: 55000,
      },
      versions: [
        {
          version: 1,
          effectiveFrom: "2025-01-01",
          effectiveTo: "2026-03-01",
          monthlyGross: 40000,
          expectedMonthlyNet: 37800,
        },
        {
          version: 2,
          effectiveFrom: "2026-03-01",
          monthlyGross: 60000,
          expectedMonthlyNet: 55000,
        },
      ],
    });
    expect(result.status).toBe("found");
    if (result.status === "found") {
      expect(result.structure.version).toBe(1);
      expect(result.structure.expectedMonthlyNet).toBe(37800);
    }
  });
});

describe("payment search window", () => {
  it("extends past month-end so February payments can settle January salary", () => {
    const window = paymentSearchWindow(jan2026, { daysBefore: 10, daysAfter: 28 });
    expect(window.searchStart.toISOString().startsWith("2025-12")).toBe(true);
    // 31 Jan + 28 days = 28 Feb — still February, not March.
    expect(window.searchEnd.getUTCMonth()).toBe(1);
  });
});

describe("populate diagnostics copy", () => {
  it("explains empty company and empty eligibility distinctly", () => {
    expect(
      summarizePopulateReason({
        employeesFound: 0,
        eligibleEmployees: 0,
        excludedJoinedAfter: 0,
        excludedExitedBefore: 0,
        linesCreated: 0,
        linesPreserved: 0,
        linesRefreshed: 0,
        salaryReviewRequired: 0,
        paymentsMatched: 0,
        paymentsUnmatched: 0,
        contactDetailsMissing: 0,
        runEditable: true,
      }).reason,
    ).toBe("no_employees_in_company");

    expect(
      summarizePopulateReason({
        employeesFound: 5,
        eligibleEmployees: 0,
        excludedJoinedAfter: 5,
        excludedExitedBefore: 0,
        linesCreated: 0,
        linesPreserved: 0,
        linesRefreshed: 0,
        salaryReviewRequired: 0,
        paymentsMatched: 0,
        paymentsUnmatched: 0,
        contactDetailsMissing: 0,
        runEditable: true,
      }).reason,
    ).toBe("no_employees_employed_during_period");
  });
});

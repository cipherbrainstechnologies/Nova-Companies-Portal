import { describe, expect, it } from "vitest";
import {
  comparePaymentAmount,
  extractBeneficiaryName,
  outcomeFromIdentityAndAmount,
  scoreEmployeeIdentity,
  tokenCoverage,
  tokensSoftEqual,
} from "@/server/payroll/identity-matching";

describe("identity-first payment matching", () => {
  it("matches reordered and extended beneficiary names", () => {
    const cases = [
      {
        employee: "Jainil Solanki",
        narration: "NEFT/EB/AXOEB/SOLANKI JAINIL ALPESHBHAI/HDFC BANK//",
      },
      {
        employee: "Hardik Suthar",
        narration: "NEFT/EB/X/SUTHAR HARDIKKUMAR/HDFC BANK",
      },
      {
        employee: "Syed Akhtar",
        narration: "NEFT/EB/X/SYED SHOAIB AKHTAR/AXIS",
      },
      {
        employee: "Jay Dhameliya",
        narration: "NEFT/EB/X/DHAMELIYA JAY ASHVINBHAI/HDFC",
      },
    ];
    for (const example of cases) {
      const identity = scoreEmployeeIdentity(example.narration, {
        employeeId: "e",
        displayName: example.employee,
      });
      expect(identity.score, example.employee).toBeGreaterThanOrEqual(62);
      expect(extractBeneficiaryName(example.narration).length).toBeGreaterThan(0);
    }
  });

  it("does not treat equal amounts alone as identity", () => {
    const identity = scoreEmployeeIdentity(
      "NEFT/EB/X/SOLANKI JAINIL ALPESHBHAI/HDFC",
      { employeeId: "h", displayName: "Hitesh Patel" },
    );
    expect(identity.score).toBeLessThan(62);
  });

  it("supports soft token equality for compound given names", () => {
    expect(tokensSoftEqual("HARDIK", "HARDIKKUMAR")).toBe(true);
    expect(tokenCoverage(["HARDIK", "SUTHAR"], ["SUTHAR", "HARDIKKUMAR"])).toBe(1);
  });

  it("keeps amount relation separate from identity", () => {
    expect(comparePaymentAmount(74800, 74800).relation).toBe("exact");
    expect(comparePaymentAmount(70000, 74800).relation).toBe("below");
    expect(comparePaymentAmount(80000, 74800).relation).toBe("above");
    expect(comparePaymentAmount(74800, null).relation).toBe("unknown");
  });

  it("maps outcomes without inventing salary when expected is missing", () => {
    expect(
      outcomeFromIdentityAndAmount({
        identityScore: 70,
        unique: true,
        amountRelation: "unknown",
        historicalSalaryMissing: true,
        alreadyAllocated: false,
      }),
    ).toBe("HISTORICAL_SALARY_REQUIRED");

    expect(
      outcomeFromIdentityAndAmount({
        identityScore: 70,
        unique: true,
        amountRelation: "below",
        historicalSalaryMissing: false,
        alreadyAllocated: false,
      }),
    ).toBe("BELOW_EXPECTED_NET");

    expect(
      outcomeFromIdentityAndAmount({
        identityScore: 40,
        unique: true,
        amountRelation: "exact",
        historicalSalaryMissing: false,
        alreadyAllocated: false,
      }),
    ).toBe("IDENTITY_UNCERTAIN");
  });
});

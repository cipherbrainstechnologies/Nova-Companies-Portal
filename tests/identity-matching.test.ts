import { describe, expect, it } from "vitest";
import {
  comparePaymentAmount,
  extractBeneficiaryName,
  matchEmployeeNameTokens,
  outcomeFromIdentityAndAmount,
  scoreEmployeeIdentity,
  tokenCoverage,
  tokensSoftEqual,
} from "@/server/payroll/identity-matching";

describe("identity-first payment matching", () => {
  it("matches reordered names including Harsh Thakkar ↔ THAKKAR HARSH", () => {
    const cases = [
      {
        employee: "Harsh Thakkar",
        narration: "NEFT/EB/AXOEB/THAKKAR HARSH/HDFC BANK//",
        kind: "exact_token_set",
      },
      {
        employee: "Tejaswi Settipalli",
        narration: "INB/NEFT/SETTIPALLI TEJASWI/AXIS BANK",
        kind: "exact_token_set",
      },
      {
        employee: "Jainil Solanki",
        narration: "NEFT/EB/AXOEB/SOLANKI JAINIL ALPESHBHAI/HDFC BANK//",
        kind: "employee_covered_extra",
      },
      {
        employee: "Syed Akhtar",
        narration: "NEFT/EB/X/SYED SHOAIB AKHTAR/AXIS",
        kind: "employee_covered_extra",
      },
      {
        employee: "Hardik Suthar",
        narration: "NEFT/EB/X/SUTHAR HARDIKKUMAR/HDFC BANK",
        kind: "exact_token_set",
      },
      {
        employee: "Jay Dhameliya",
        narration: "NEFT/EB/X/DHAMELIYA JAY ASHVINBHAI/HDFC",
        kind: "employee_covered_extra",
      },
    ] as const;

    for (const example of cases) {
      const identity = scoreEmployeeIdentity(example.narration, {
        employeeId: "e",
        displayName: example.employee,
      });
      expect(identity.autoLinkEligible, example.employee).toBe(true);
      expect(identity.score, example.employee).toBeGreaterThanOrEqual(70);
      expect(identity.matchKind, example.employee).toBe(example.kind);
      expect(extractBeneficiaryName(example.narration).length).toBeGreaterThan(0);
    }
  });

  it("strips honorifics and preserves multiline beneficiary word boundaries", () => {
    const identity = scoreEmployeeIdentity("NEFT/MR HARSH\nTHAKKAR/HDFC", {
      employeeId: "e",
      displayName: "Harsh Thakkar",
    });
    expect(identity.autoLinkEligible).toBe(true);
    expect(identity.matchKind).toBe("exact_token_set");
  });

  it("does not match Harsh to Harshal (prefix-only names)", () => {
    expect(tokensSoftEqual("HARSH", "HARSHAL")).toBe(false);
    const identity = scoreEmployeeIdentity("NEFT/HARSHAL PATEL/HDFC", {
      employeeId: "e",
      displayName: "Harsh Thakkar",
    });
    expect(identity.autoLinkEligible).toBe(false);
  });

  it("requires at least two tokens — first name alone is not enough", () => {
    const match = matchEmployeeNameTokens("Harsh", ["HARSH", "PATEL"]);
    expect(match.autoLinkEligible).toBe(false);
    expect(match.kind).toBe("partial");
  });

  it("does not treat equal amounts alone as identity", () => {
    const identity = scoreEmployeeIdentity("NEFT/EB/X/SOLANKI JAINIL ALPESHBHAI/HDFC", {
      employeeId: "h",
      displayName: "Hitesh Patel",
    });
    expect(identity.autoLinkEligible).toBe(false);
    expect(identity.score).toBeLessThan(70);
  });

  it("supports soft token equality only for compound given names", () => {
    expect(tokensSoftEqual("HARDIK", "HARDIKKUMAR")).toBe(true);
    expect(tokenCoverage(["HARDIK", "SUTHAR"], ["SUTHAR", "HARDIKKUMAR"])).toBe(1);
  });

  it("blocks auto-link when account last-4 contradicts", () => {
    const identity = scoreEmployeeIdentity(
      "NEFT/THAKKAR HARSH/HDFC",
      {
        employeeId: "e",
        displayName: "Harsh Thakkar",
        accountLast4: "1234",
      },
      { transactionAccountLast4: "9999" },
    );
    expect(identity.autoLinkEligible).toBe(false);
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
        identityScore: 75,
        unique: true,
        amountRelation: "unknown",
        historicalSalaryMissing: true,
        alreadyAllocated: false,
        autoLinkEligible: true,
      }),
    ).toBe("HISTORICAL_SALARY_REQUIRED");

    expect(
      outcomeFromIdentityAndAmount({
        identityScore: 75,
        unique: true,
        amountRelation: "below",
        historicalSalaryMissing: false,
        alreadyAllocated: false,
        autoLinkEligible: true,
      }),
    ).toBe("BELOW_EXPECTED_NET");

    expect(
      outcomeFromIdentityAndAmount({
        identityScore: 40,
        unique: true,
        amountRelation: "exact",
        historicalSalaryMissing: false,
        alreadyAllocated: false,
        autoLinkEligible: false,
      }),
    ).toBe("IDENTITY_UNCERTAIN");
  });
});

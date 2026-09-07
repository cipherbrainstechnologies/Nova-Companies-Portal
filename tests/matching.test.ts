import { describe, expect, it } from "vitest";
import {
  decideSuggestionStatus,
  extractBeneficiaryFromParticulars,
  rankMatchSuggestions,
  scoreMatch,
} from "@/server/statements/matching";

describe("matching", () => {
  it("scores Jeena-like narration highly for matching employee", () => {
    const breakdown = scoreMatch({
      particulars: "NEFT/NOVAQORE/JEENA ANN JOHN/SALARY AUG",
      employeeName: "Jeena Ann John",
      txnAmount: 41467,
      expectedNet: 41467,
      hasPriorMapping: true,
    });
    expect(breakdown.nameScore).toBeGreaterThan(30);
    expect(breakdown.total).toBeGreaterThanOrEqual(50);
  });

  it("rejects weak matches as NEEDS_REVIEW", () => {
    const status = decideSuggestionStatus([{ employeeId: "1", score: 20 }]);
    expect(status).toBe("NEEDS_REVIEW");
  });

  it("flags collisions as NEEDS_REVIEW", () => {
    const status = decideSuggestionStatus([
      { employeeId: "1", score: 70 },
      { employeeId: "2", score: 68 },
    ]);
    expect(status).toBe("NEEDS_REVIEW");
  });

  it("uses the complete 100-point deterministic score", () => {
    const result = scoreMatch(
      {
        particulars: "NEFT/JEENA ANN JOHN/ACCOUNT 991234",
        amount: 41467,
        accountLast4: "1234",
      },
      {
        employeeId: "jeena",
        employeeName: "Jeena Ann John",
        accountLast4: "1234",
        expectedNetPay: 41467,
        hasPriorApprovedMapping: true,
      },
    );
    expect(result.score).toBe(100);
  });

  it("caps the score at 100 when an alias also matches", () => {
    const result = scoreMatch(
      {
        particulars: "NEFT/J A JOHN/ACCOUNT 991234",
        amount: 41467,
        accountLast4: "1234",
      },
      {
        employeeId: "jeena",
        employeeName: "Jeena Ann John",
        accountHolderName: "J A JOHN",
        paymentAliases: ["J A John"],
        accountLast4: "1234",
        expectedNetPay: 41467,
        hasPriorApprovedMapping: true,
      },
    );
    expect(result.breakdown.paymentAlias).toBe(5);
    expect(result.score).toBe(100);
  });

  it("never auto-selects when ranking suggestions", () => {
    const ranked = rankMatchSuggestions(
      { particulars: "NEFT/JEENA ANN JOHN/SALARY", amount: 41467 },
      [{ employeeId: "jeena", employeeName: "Jeena Ann John", expectedNetPay: 41467 }],
    );
    expect(ranked[0].status).toBe("SUGGESTED");
  });

  it("extracts beneficiary from Axis particulars", () => {
    expect(extractBeneficiaryFromParticulars("NEFT/NOVAQORE/PRASHANT DHAKED/SALARY")).toContain(
      "PRASHANT",
    );
  });
});

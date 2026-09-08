import { describe, expect, it } from "vitest";
import {
  classifyReconciliationFilter,
  itemMatchesFilter,
  type PayrollReconciliationItem,
} from "@/server/payroll/unresolved-payments";

function item(
  overrides: Partial<PayrollReconciliationItem> &
    Pick<PayrollReconciliationItem, "paymentStatus">,
): PayrollReconciliationItem {
  return {
    kind: "payroll_line",
    lineId: "line-1",
    employeeId: "emp-1",
    employeeCode: "NW-0001",
    employeeName: "Test User",
    companyId: "co-1",
    companyName: "Nova Workforce",
    payrollRunId: "run-1",
    year: 2026,
    month: 1,
    lineStatus: "DRAFT",
    expectedAmount: 40000,
    actualAmount: null,
    varianceAmount: null,
    paymentReference: null,
    approvalReason: null,
    primaryTxnId: null,
    contactIncomplete: false,
    matchOutcome: null,
    matchExplanation: null,
    matchCandidates: [],
    searchWindowDisplay: null,
    transaction: null,
    ...overrides,
  };
}

describe("payroll reconciliation filters", () => {
  it("classifies unresolved statuses into review buckets", () => {
    expect(classifyReconciliationFilter(item({ paymentStatus: "UNMATCHED" }))).toBe("unmatched");
    expect(
      classifyReconciliationFilter(item({ paymentStatus: "PARTIAL_PAYMENT_REVIEW_REQUIRED" })),
    ).toBe("below_expected");
    expect(
      classifyReconciliationFilter(item({ paymentStatus: "AMOUNT_MISMATCH_REVIEW_REQUIRED" })),
    ).toBe("above_expected");
    expect(
      classifyReconciliationFilter(item({ paymentStatus: "SALARY_STRUCTURE_INCOMPLETE" })),
    ).toBe("missing_structure");
    expect(classifyReconciliationFilter(item({ paymentStatus: "MATCHED_EXACT" }))).toBe("resolved");
  });

  it("treats unmatched with multiple suggestions as ambiguous", () => {
    expect(
      classifyReconciliationFilter(
        item({
          paymentStatus: "UNMATCHED",
          transaction: {
            id: "t1",
            txnDate: "2026-02-01T00:00:00.000Z",
            valueDate: null,
            particulars: "NEFT/EB/FOO",
            debit: 39000,
            utrReference: null,
            chequeNumber: null,
            matchScore: 40,
            matchExplanation: null,
            reviewReason: null,
            salaryYear: 2026,
            salaryMonth: 1,
            reconciliationStatus: "UNMATCHED",
            suggestions: [
              { employeeId: "a", employeeCode: "NW-1", employeeName: "A", score: 55 },
              { employeeId: "b", employeeCode: "NW-2", employeeName: "B", score: 52 },
            ],
          },
        }),
      ),
    ).toBe("ambiguous");
  });

  it("does not treat missing expected salary as a zero difference bucket", () => {
    const missing = item({
      paymentStatus: "SALARY_STRUCTURE_INCOMPLETE",
      expectedAmount: null,
      actualAmount: 25000,
      varianceAmount: null,
    });
    expect(classifyReconciliationFilter(missing)).toBe("missing_structure");
    expect(itemMatchesFilter(missing, "below_expected")).toBe(false);
    expect(itemMatchesFilter(missing, "unresolved")).toBe(true);
  });
});

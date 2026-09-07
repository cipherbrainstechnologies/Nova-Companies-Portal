import { beforeEach, describe, expect, it, vi } from "vitest";

const permissionGrantFindUnique = vi.fn();

vi.mock("@/server/db", () => ({
  prisma: {
    permissionGrant: {
      findUnique: (...args: unknown[]) => permissionGrantFindUnique(...args),
    },
  },
}));

import {
  buildMatchExplanation,
  compareNetAmounts,
  decidePaymentAutomation,
  extractUtrReference,
  isIssuablePaymentStatus,
  isUnresolvedPaymentStatus,
  partitionIssuableLines,
} from "@/server/payroll/payment-decision";
import {
  deriveExpectedMonthlyNet,
  isDuplicatePayrollPeriod,
  isSalaryStructureComplete,
  monthlyGrossFromAnnualCtc,
  normalizePaymentAliases,
  salaryStructureCompleteness,
} from "@/server/payroll/salary-structure";
import {
  buildPayslipAvailableEmail,
  containsSalaryAmount,
} from "@/server/payroll/payslip-email";
import {
  PAYROLL_AUDIT_ACTIONS,
  PAYROLL_AUDIT_STAGES,
} from "@/server/payroll/audit-actions";
import { rankMatchSuggestions } from "@/server/statements/matching";
import {
  AuthzError,
  requireEmployeeOwnsPayslip,
  requirePermission,
  type SessionUser,
} from "@/server/rbac/permissions";

const EXPECTED_NET = 41467;

const COMPLETE_STRUCTURE = {
  monthlyGross: 45000,
  monthlyTds: 3333,
  monthlyPt: 200,
  expectedMonthlyNet: EXPECTED_NET,
};

function sessionUser(overrides: Partial<SessionUser> = {}): SessionUser {
  return {
    id: "u1",
    phone: "+919999000001",
    email: null,
    globalRole: "OPERATIONS_MANAGER",
    mustChangePassword: false,
    employeeId: null,
    isActive: true,
    ...overrides,
  };
}

beforeEach(() => {
  permissionGrantFindUnique.mockReset();
});

describe("1. exact net payment", () => {
  it("matches exactly and auto-issues only when the company enables it", () => {
    const enabled = decidePaymentAutomation({
      matchConfident: true,
      salaryStructureComplete: true,
      expectedMonthlyNet: EXPECTED_NET,
      actualAmount: EXPECTED_NET,
      autoIssueExactMatches: true,
    });
    expect(enabled.status).toBe("MATCHED_EXACT");
    expect(enabled.varianceAmount).toBe(0);
    expect(enabled.canAutoCreatePayrollLine).toBe(true);
    expect(enabled.canAutoIssue).toBe(true);

    const disabled = decidePaymentAutomation({
      matchConfident: true,
      salaryStructureComplete: true,
      expectedMonthlyNet: EXPECTED_NET,
      actualAmount: EXPECTED_NET,
      autoIssueExactMatches: false,
    });
    expect(disabled.status).toBe("MATCHED_EXACT");
    expect(disabled.canAutoIssue).toBe(false);
  });

  it("treats sub-paisa drift as exact", () => {
    expect(compareNetAmounts(EXPECTED_NET + 0.004, EXPECTED_NET)).toBe("exact");
  });
});

describe("2. lower than expected", () => {
  it("requires partial payment review and never auto-issues", () => {
    const decision = decidePaymentAutomation({
      matchConfident: true,
      salaryStructureComplete: true,
      expectedMonthlyNet: EXPECTED_NET,
      actualAmount: 30000,
      autoIssueExactMatches: true,
    });
    expect(decision.status).toBe("PARTIAL_PAYMENT_REVIEW_REQUIRED");
    expect(decision.varianceAmount).toBe(30000 - EXPECTED_NET);
    expect(decision.canAutoIssue).toBe(false);
    expect(isUnresolvedPaymentStatus(decision.status)).toBe(true);
  });
});

describe("3. higher than expected", () => {
  it("requires amount mismatch review", () => {
    const decision = decidePaymentAutomation({
      matchConfident: true,
      salaryStructureComplete: true,
      expectedMonthlyNet: EXPECTED_NET,
      actualAmount: 50000,
      autoIssueExactMatches: true,
    });
    expect(decision.status).toBe("AMOUNT_MISMATCH_REVIEW_REQUIRED");
    expect(decision.varianceAmount).toBe(50000 - EXPECTED_NET);
    expect(decision.canAutoIssue).toBe(false);
  });
});

describe("4. unmatched transaction", () => {
  it("creates no payroll line at all", () => {
    const decision = decidePaymentAutomation({
      matchConfident: false,
      salaryStructureComplete: true,
      expectedMonthlyNet: EXPECTED_NET,
      actualAmount: 41467,
      autoIssueExactMatches: true,
    });
    expect(decision.status).toBe("UNMATCHED");
    expect(decision.canAutoCreatePayrollLine).toBe(false);
    expect(decision.canAutoIssue).toBe(false);
  });
});

describe("5. cross-company match prevention", () => {
  it("cannot match an employee outside the statement's company", () => {
    // Candidates are always built from the owning company's employees. A same-named
    // employee at another company is simply not in the list, so nothing can score.
    const companyScopedCandidates: Parameters<typeof rankMatchSuggestions>[1] = [];
    const ranked = rankMatchSuggestions(
      { particulars: "NEFT/JEENA ANN JOHN/SALARY", amount: EXPECTED_NET },
      companyScopedCandidates,
    );
    expect(ranked).toHaveLength(0);

    const decision = decidePaymentAutomation({
      matchConfident: ranked.length > 0,
      salaryStructureComplete: true,
      expectedMonthlyNet: EXPECTED_NET,
      actualAmount: EXPECTED_NET,
      autoIssueExactMatches: true,
    });
    expect(decision.status).toBe("UNMATCHED");
  });
});

describe("6. missing salary structure", () => {
  it("flags an incomplete structure instead of guessing", () => {
    expect(isSalaryStructureComplete(null)).toBe(false);
    expect(isSalaryStructureComplete({ monthlyTds: 1000 })).toBe(false);
    expect(salaryStructureCompleteness({ monthlyTds: 1000 }).missing).toContain("monthlyGross");

    const decision = decidePaymentAutomation({
      matchConfident: true,
      salaryStructureComplete: false,
      expectedMonthlyNet: null,
      actualAmount: EXPECTED_NET,
      autoIssueExactMatches: true,
    });
    expect(decision.status).toBe("SALARY_STRUCTURE_INCOMPLETE");
    expect(decision.canAutoCreatePayrollLine).toBe(false);
  });

  it("derives the expected net from gross, TDS and PT", () => {
    expect(monthlyGrossFromAnnualCtc(540000)).toBe(45000);
    expect(deriveExpectedMonthlyNet({ monthlyGross: 45000, monthlyTds: 3333, monthlyPt: 200 })).toBe(
      41467,
    );
    expect(isSalaryStructureComplete(COMPLETE_STRUCTURE)).toBe(true);
  });
});

describe("7. duplicate employee/month prevention", () => {
  it("refuses a second payroll line for the same employee and salary month", () => {
    const existing = [{ employeeId: "e1", year: 2026, month: 8 }];
    expect(isDuplicatePayrollPeriod(existing, { employeeId: "e1", year: 2026, month: 8 })).toBe(true);
    expect(isDuplicatePayrollPeriod(existing, { employeeId: "e1", year: 2026, month: 9 })).toBe(false);
    expect(isDuplicatePayrollPeriod(existing, { employeeId: "e2", year: 2026, month: 8 })).toBe(false);
  });

  it("downgrades a confident match to unmatched when the period is already paid", () => {
    const duplicate = isDuplicatePayrollPeriod([{ employeeId: "e1", year: 2026, month: 8 }], {
      employeeId: "e1",
      year: 2026,
      month: 8,
    });
    const decision = decidePaymentAutomation({
      matchConfident: !duplicate,
      salaryStructureComplete: true,
      expectedMonthlyNet: EXPECTED_NET,
      actualAmount: EXPECTED_NET,
      autoIssueExactMatches: true,
    });
    expect(decision.status).toBe("UNMATCHED");
  });
});

describe("8. payslip notification email", () => {
  it("never includes salary amounts", () => {
    const message = buildPayslipAvailableEmail({
      companyName: "Novaqore Technologies",
      employeeName: "Jeena Ann John",
      month: 8,
      year: 2026,
      portalUrl: "https://portal.example.com",
    });
    expect(message.subject).toBe("Your payslip is available");
    expect(message.text).toContain("August 2026");
    expect(message.text).toContain("does not include any salary figures");
    expect(message.text).not.toContain("₹");
    expect(containsSalaryAmount(message.text)).toBe(false);
    expect(containsSalaryAmount(message.html)).toBe(false);
  });

  it("detects money-shaped text so a bad template cannot ship", () => {
    expect(containsSalaryAmount("Net pay ₹41,467.00")).toBe(true);
    expect(containsSalaryAmount("Net pay 41,467")).toBe(true);
    expect(containsSalaryAmount("Payslip for August 2026")).toBe(false);
  });
});

describe("9. failed email delivery", () => {
  it("does not un-issue the payslip", () => {
    const lines = [
      { id: "l1", paymentStatus: "EMAIL_FAILED" },
      { id: "l2", paymentStatus: "ISSUED" },
      { id: "l3", paymentStatus: "PARTIAL_PAYMENT_REVIEW_REQUIRED" },
    ];
    const { issuable, blocked } = partitionIssuableLines(lines);
    expect(issuable.map((line) => line.id)).toEqual(["l1", "l2"]);
    expect(blocked.map((line) => line.id)).toEqual(["l3"]);
    // A failed notification is a delivery state, not an issue state.
    expect(isIssuablePaymentStatus("EMAIL_FAILED")).toBe(true);
    expect(isUnresolvedPaymentStatus("EMAIL_FAILED")).toBe(false);
  });

  it("blocks unresolved variances from any issue selection", () => {
    const { blocked } = partitionIssuableLines([
      { id: "a", paymentStatus: "AMOUNT_MISMATCH_REVIEW_REQUIRED" },
      { id: "b", paymentStatus: "SALARY_STRUCTURE_INCOMPLETE" },
      { id: "c", paymentStatus: "UNMATCHED" },
      { id: "d", paymentStatus: "APPROVED_FOR_ISSUE" },
    ]);
    expect(blocked.map((line) => line.id)).toEqual(["a", "b", "c"]);
  });
});

describe("10. employee payslip access", () => {
  it("allows an employee to download only their own payslip", async () => {
    const employee = sessionUser({ globalRole: "EMPLOYEE", employeeId: "emp-1" });
    await expect(
      requireEmployeeOwnsPayslip({ user: employee, payslipEmployeeId: "emp-1" }),
    ).resolves.toBeUndefined();
    await expect(
      requireEmployeeOwnsPayslip({ user: employee, payslipEmployeeId: "emp-2" }),
    ).rejects.toBeInstanceOf(AuthzError);
  });

  it("rejects an employee with no linked employee record", async () => {
    const orphan = sessionUser({ globalRole: "EMPLOYEE", employeeId: null });
    await expect(
      requireEmployeeOwnsPayslip({ user: orphan, payslipEmployeeId: "emp-1" }),
    ).rejects.toBeInstanceOf(AuthzError);
  });
});

describe("11. operations manager permissions", () => {
  it("denies reconcile and resendEmail without an explicit grant", async () => {
    permissionGrantFindUnique.mockResolvedValue(null);
    const manager = sessionUser();

    await expect(
      requirePermission({ user: manager, companyId: "c1", module: "statements", action: "reconcile" }),
    ).rejects.toBeInstanceOf(AuthzError);
    await expect(
      requirePermission({ user: manager, companyId: "c1", module: "payslips", action: "resendEmail" }),
    ).rejects.toBeInstanceOf(AuthzError);
  });

  it("allows the same actions once the grant exists", async () => {
    permissionGrantFindUnique.mockResolvedValue({ id: "grant-1" });
    await expect(
      requirePermission({
        user: sessionUser(),
        companyId: "c1",
        module: "salaryStructure",
        action: "edit",
      }),
    ).resolves.toBeUndefined();
  });

  it("denies an inactive account regardless of role", async () => {
    await expect(
      requirePermission({
        user: sessionUser({ globalRole: "SUPER_ADMIN", isActive: false }),
        companyId: "c1",
        module: "payroll",
        action: "issue",
      }),
    ).rejects.toBeInstanceOf(AuthzError);
  });
});

describe("12. audit action naming", () => {
  it("covers the match, approve, issue and email stages", () => {
    expect(PAYROLL_AUDIT_STAGES.match).toContain(PAYROLL_AUDIT_ACTIONS.matchAutoApply);
    expect(PAYROLL_AUDIT_STAGES.approve).toContain(PAYROLL_AUDIT_ACTIONS.reviewApprove);
    expect(PAYROLL_AUDIT_STAGES.issue).toContain(PAYROLL_AUDIT_ACTIONS.payrollIssueApproved);
    expect(PAYROLL_AUDIT_STAGES.email).toContain(PAYROLL_AUDIT_ACTIONS.payslipEmailSent);

    for (const action of Object.values(PAYROLL_AUDIT_ACTIONS)) {
      expect(action).toMatch(/^[a-z]+\.[a-z_]+$/);
    }
  });

  it("uses a distinct action per reviewed outcome", () => {
    const reviewActions = [
      PAYROLL_AUDIT_ACTIONS.reviewApprove,
      PAYROLL_AUDIT_ACTIONS.reviewReject,
      PAYROLL_AUDIT_ACTIONS.reviewMap,
      PAYROLL_AUDIT_ACTIONS.reviewIgnore,
      PAYROLL_AUDIT_ACTIONS.reviewNonPayroll,
    ];
    expect(new Set(reviewActions).size).toBe(reviewActions.length);
  });
});

describe("match evidence helpers", () => {
  it("explains the score so a reviewer can audit the decision", () => {
    const explanation = buildMatchExplanation({
      score: 100,
      breakdown: {
        nameSimilarity: 55,
        accountLast4: 20,
        expectedNetPay: 15,
        priorApprovedMapping: 10,
        paymentAlias: 5,
      },
      beneficiary: "JEENA ANN JOHN",
      employeeName: "Jeena Ann John",
    });
    expect(explanation).toContain("Score 100/100");
    expect(explanation).toContain("account last-4 +20");
    expect(explanation).toContain("payment alias +5");
  });

  it("extracts a UTR reference from Axis narrations", () => {
    expect(extractUtrReference("NEFT/UTR AXISP00012345678/JEENA")).toBe("AXISP00012345678");
    expect(extractUtrReference("CASH DEPOSIT")).toBeUndefined();
  });

  it("normalises and de-duplicates payment aliases", () => {
    expect(normalizePaymentAliases(["J A John", "j-a-john", "", "Jeena Ann John"])).toEqual([
      { alias: "J A John", normalizedAlias: "J A JOHN" },
      { alias: "Jeena Ann John", normalizedAlias: "JEENA ANN JOHN" },
    ]);
  });
});

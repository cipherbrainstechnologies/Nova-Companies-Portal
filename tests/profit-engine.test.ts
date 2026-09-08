import { describe, expect, it } from "vitest";
import type { TransactionClassification } from "@prisma/client";
import {
  combineProfitSummaries,
  policyRulesForPrefix,
  resolveProfitAssignment,
  summarizeEarnedProfit,
  type ProfitLineInput,
} from "@/server/finance/profit-engine";

function line(
  particulars: string,
  amounts: { debit?: number; credit?: number },
  classification: TransactionClassification = "UNCLASSIFIED",
): ProfitLineInput {
  return {
    particulars,
    debit: amounts.debit ?? 0,
    credit: amounts.credit ?? 0,
    classification,
  };
}

/**
 * Verified reconciliation fixture totals — assertions only.
 * These amounts must never be hard-coded into the calculation engine.
 */
const EXPECTED = {
  nwEarned: 747825.6,
  nqEarned: 399778.1,
  combined: 1147603.7,
  afterCorePersonal: 974918.94,
  actualRemaining: 725418.94,
} as const;

describe("mandatory earned profit policy fixtures", () => {
  it("computes Nova Workforce earned profit from classified lines", () => {
    const nw = summarizeEarnedProfit(
      [
        line("NEFT CR-SANA LIFE SCIENCE PVT LTD", { credit: 1954189.09 }),
        line("NEFT CR-SKYDOTEC SOLUTIONS", { credit: 146169.51 }),
        line("NEFT SALARY / OVERTIME EMPLOYEE BATCH", { debit: 1199421 }),
        line("CASH-HARDIK SALARY", { debit: 100000 }),
        line("CBDT TAX PAYMENT", { debit: 53112 }),
        // Must not affect earned profit
        line("HOME LOAN EMI", { debit: 63220 }),
        line("OPENING BALANCE", { credit: 500000 }),
        line("MYSTERY DEBIT UNMATCHED", { debit: 9999 }),
      ],
      policyRulesForPrefix("NW"),
    );

    expect(nw.revenue).toBe(2100358.6);
    expect(nw.salariesOvertime).toBe(1199421);
    expect(nw.cashSalaryPayments).toBe(100000);
    expect(nw.cbdtTax).toBe(53112);
    expect(nw.earnedOperatingProfit).toBe(EXPECTED.nwEarned);
    expect(nw.unclassified.count).toBe(1);
    expect(nw.unclassified.totalDebit).toBe(9999);
    // Personal financing present but not in earned profit
    expect(nw.personalFinancing.homeLoan).toBe(63220);
    expect(nw.earnedOperatingProfit).not.toBe(nw.cashRemaining);
  });

  it("computes Nova Qore earned profit from classified lines", () => {
    const nq = summarizeEarnedProfit(
      [
        line("IMPS-SANA LIFE SCIENCE CREDIT", { credit: 1951059.1 }),
        line("SALARY AND OVERTIME PAYROLL", { debit: 1323356 }),
        line("PAYMENT TO HIREN", { debit: 55930 }),
        line("PAYMENT TO PARTH", { debit: 95620 }),
        line("CBDT PAYMENT", { debit: 76375 }),
      ],
      policyRulesForPrefix("NQ"),
    );

    expect(nq.revenue).toBe(1951059.1);
    expect(nq.salariesOvertime).toBe(1323356);
    expect(nq.otherBusinessExpenses).toBe(55930 + 95620);
    expect(nq.cbdtTax).toBe(76375);
    expect(nq.earnedOperatingProfit).toBe(EXPECTED.nqEarned);
  });

  it("combines earned profit and cash-remaining ladder without altering earned totals", () => {
    const nw = summarizeEarnedProfit(
      [
        line("SANA LIFE SCIENCE", { credit: 1954189.09 }),
        line("SKYDOTEC", { credit: 146169.51 }),
        line("SALARY OVERTIME", { debit: 1199421 }),
        line("HARDIK CASH", { debit: 100000 }),
        line("CBDT", { debit: 53112 }),
        line("HOME LOAN", { debit: 63220 }),
        line("BAJAJ EMI", { debit: 53137 }),
        line("CREDIT CARD PAYMENT", { debit: 56327.76 }),
        line("TRANSFER TO LOVE", { debit: 172000 }),
        line("THREADS CHEQUE", { debit: 77500 }),
      ],
      policyRulesForPrefix("NW"),
    );

    const nq = summarizeEarnedProfit(
      [
        line("SANA LIFE SCIENCE", { credit: 1951059.1 }),
        line("SALARY OVERTIME", { debit: 1323356 }),
        line("HIREN", { debit: 55930 }),
        line("PARTH", { debit: 95620 }),
        line("CBDT", { debit: 76375 }),
      ],
      policyRulesForPrefix("NQ"),
    );

    expect(nw.earnedOperatingProfit).toBe(EXPECTED.nwEarned);
    expect(nq.earnedOperatingProfit).toBe(EXPECTED.nqEarned);

    const combined = combineProfitSummaries(nw, nq);
    expect(combined.earnedOperatingProfit).toBe(EXPECTED.combined);
    expect(combined.profitAfterPersonalFinance).toBe(EXPECTED.afterCorePersonal);
    expect(combined.cashRemainingAfterDeductions).toBe(EXPECTED.actualRemaining);
  });

  it("lets manual classification override narration rules", () => {
    const rules = policyRulesForPrefix("NW");
    // Narration looks like salary, but manual REVENUE wins.
    const assignment = resolveProfitAssignment(
      "NEFT SALARY BATCH FROM CLIENT",
      "REVENUE",
      rules,
    );
    expect(assignment.matchedBy).toBe("manual_classification");
    expect(assignment.categoryKey).toBe("REVENUE");

    const summary = summarizeEarnedProfit(
      [line("NEFT SALARY BATCH FROM CLIENT", { credit: 1000 }, "REVENUE")],
      rules,
    );
    expect(summary.revenue).toBe(1000);
    expect(summary.businessExpenses).toBe(0);
  });

  it("never treats bank balance or unclassified amounts as earned profit", () => {
    const summary = summarizeEarnedProfit(
      [
        line("SANA LIFE SCIENCE", { credit: 100000 }),
        line("CLOSING BALANCE", { credit: 999999 }),
        line("UNKNOWN VENDOR", { debit: 50000 }),
      ],
      policyRulesForPrefix("NW"),
    );
    expect(summary.earnedOperatingProfit).toBe(100000);
    expect(summary.unclassified.totalDebit).toBe(50000);
    expect(summary.earnedOperatingProfit).not.toBe(999999);
  });
});

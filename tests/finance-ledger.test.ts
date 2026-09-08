import { describe, expect, it } from "vitest";
import {
  buildBankLedgerMonths,
  computeGrowth,
  validateStatementBalances,
} from "@/server/finance/finance-ledger";

describe("finance ledger balance validation", () => {
  it("reconciles opening + credits − debits to closing", () => {
    const check = validateStatementBalances({
      openingBalance: 1076122.84,
      statementClosingBalance: 1358340.11,
      transactions: [
        { txnDate: new Date("2025-04-01T00:00:00Z"), debit: 744765, credit: 0, balance: 331357.84, rowIndex: 1, particulars: "salaries" },
        { txnDate: new Date("2025-04-04T00:00:00Z"), debit: 100000, credit: 0, balance: 231357.84, rowIndex: 2, particulars: "love" },
        { txnDate: new Date("2025-04-21T00:00:00Z"), debit: 42683, credit: 0, balance: 188674.84, rowIndex: 3, particulars: "tax" },
        {
          txnDate: new Date("2025-04-23T00:00:00Z"),
          debit: 0,
          credit: 1171876.27,
          balance: 1360551.11,
          rowIndex: 4,
          particulars: "sana",
        },
        { txnDate: new Date("2025-04-30T00:00:00Z"), debit: 2211, credit: 0, balance: 1358340.11, rowIndex: 5, particulars: "amc" },
      ],
    });
    expect(check.totalCredits).toBe(1171876.27);
    expect(check.totalDebits).toBe(889659);
    expect(check.calculatedClosingBalance).toBe(1358340.11);
    expect(check.reconciliationDifference).toBe(0);
    expect(check.statementReconciled).toBe(true);
  });

  it("flags statement reconciliation failure on mismatch", () => {
    const check = validateStatementBalances({
      openingBalance: 100,
      statementClosingBalance: 999,
      transactions: [
        {
          txnDate: new Date("2025-04-01T00:00:00Z"),
          debit: 10,
          credit: 0,
          balance: 90,
          rowIndex: 1,
          particulars: "x",
        },
      ],
    });
    expect(check.statementReconciled).toBe(false);
    expect(check.reconciliationDifference).not.toBe(0);
  });
});

describe("bank ledger month carry-forward", () => {
  it("carries closing into next opening and keeps unclassified cash in totals", () => {
    const months = buildBankLedgerMonths({
      openingBalance: 1076122.84,
      transactions: [
        { txnDate: new Date("2025-04-01T00:00:00Z"), debit: 100, credit: 0 },
        { txnDate: new Date("2025-04-23T00:00:00Z"), debit: 0, credit: 500 },
        { txnDate: new Date("2025-05-01T00:00:00Z"), debit: 50, credit: 0 },
      ],
    });
    expect(months[0]?.opening).toBe(1076122.84);
    expect(months[0]?.credits).toBe(500);
    expect(months[0]?.debits).toBe(100);
    expect(months[0]?.closing).toBe(1076522.84);
    expect(months[1]?.opening).toBe(1076522.84);
    expect(months[1]?.closing).toBe(1076472.84);
  });
});

describe("growth metric", () => {
  it("returns N/A when previous is zero or period is provisional", () => {
    expect(computeGrowth(100, 0).label).toMatch(/N\/A|Turned/);
    expect(computeGrowth(100, 50, { provisional: true }).growthPct).toBeNull();
    expect(computeGrowth(100, 50).growthPct).toBe(100);
  });
});

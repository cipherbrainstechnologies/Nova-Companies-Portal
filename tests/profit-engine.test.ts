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

/** Verified fixture totals — assertions only; never hard-coded into the engine. */
const EXPECTED = {
  nwEarned: 747825.6,
  nqEarned: 399778.1,
  combined: 1147603.7,
  afterCorePersonal: 974918.94,
  actualRemaining: 725418.94,
  april2025NwEarned: 284428.27,
} as const;

/** April 2025 Nova Workforce statement lines (from Axis Account Statement Report). */
function april2025NwLines(): ProfitLineInput[] {
  return [
    line("NEFT/EB/AXOEB09099180058/Settipalli Tejaswi/CANARA BANK///////", { debit: 53967 }),
    line("NEFT/EB/AXOEB09099177937/RAHUL VISHWAKARMA/FEDERAL BANK///////", { debit: 24800 }),
    line("NEFT/EB/AXOEB09099175405/VADODA RIYA JENISH DEVANGB/ICICI BANK LIMITED///////", {
      debit: 150434,
    }),
    line("NEFT/EB/AXOEB09099180106/UMAR SHAFIK SHAIKH/INDIAN BANK///////", { debit: 19559 }),
    line("NEFT/EB/AXOEB09099180830/SOLANKI JAINIL ALPESHBHAI/HDFC BANK//FEB SALARY 2025/////", {
      debit: 23020,
    }),
    line("NEFT/EB/AXOEB09099177996/HARSH MUKESHBHAI PATADIA/HDFC BANK///////", { debit: 29800 }),
    line("NEFT/EB/AXOEB09099177042/SOLANKI JAINIL ALPESHBHAI/HDFC BANK///////", { debit: 53967 }),
    line("NEFT/EB/AXOEB09099178160/SYED SHOAIB AKHTAR/CANARA BANK///////", { debit: 41467 }),
    line("NEFT/EB/AXOEB09099176974/NIKUNJ CHAMPAKBHAI ROHIT/ICICI BANK LIMITED///////", {
      debit: 74800,
    }),
    line("NEFT/EB/AXOEB09099176932/Rohit Kumar Singh/CANARA BANK///////", { debit: 181484 }),
    // Must be bank-paid salary — NOT cash-salary via bare HARDIK match.
    line("NEFT/EB/AXOEB09099177118/SUTHAR HARDIKKUMAR/HDFC BANK///////", { debit: 91467 }),
    line("MOB/TPFT/LOVE N CHAUHAN/915010062717599", { debit: 100000 }),
    line("INB/101373511/INTERNET TAX PAYMENT/", { debit: 42683 }),
    line(
      "NEFT/HDFCH00197712907/SANA LIFE SCIENCE LTD/HDFC BANK/0001Foreign INR INW PACB remi",
      { credit: 1171876.27 },
    ),
    // Must stay unclassified / needs review.
    line("NBSM/102369041/AHMEDABAD MUNICIPAL CORPORATION(PA", { debit: 2211 }),
  ];
}

describe("mandatory earned profit policy fixtures", () => {
  it("computes Nova Workforce earned profit from classified lines", () => {
    const nw = summarizeEarnedProfit(
      [
        line("NEFT CR-SANA LIFE SCIENCE PVT LTD", { credit: 1954189.09 }),
        line("NEFT CR-SKYDOTEC SOLUTIONS", { credit: 146169.51 }),
        line("NEFT/EB/AXOEB EMPLOYEE SALARY BATCH", { debit: 1199421 }),
        line("MOB/TPFT/LOVE N CHAUHAN/HARDİK CASH", { debit: 100000 }),
        line("CBDT TAX PAYMENT", { debit: 53112 }),
        line("HOME LOAN EMI", { debit: 63220 }),
        line("OPENING BALANCE", { credit: 500000 }),
        line("MYSTERY DEBIT UNMATCHED", { debit: 9999 }),
      ],
      policyRulesForPrefix("NW"),
    );

    expect(nw.revenue).toBe(2100358.6);
    expect(nw.bankPaidSalaries).toBe(1199421);
    expect(nw.salaryRelatedCashPayments).toBe(100000);
    expect(nw.cbdtBusinessTax).toBe(53112);
    expect(nw.earnedOperatingProfit).toBe(EXPECTED.nwEarned);
    expect(nw.unclassified.count).toBe(1);
    expect(nw.personalFinancing.homeLoan).toBe(63220);
  });

  it("computes Nova Qore earned profit from classified lines", () => {
    const nq = summarizeEarnedProfit(
      [
        line("IMPS-SANA LIFE SCIENCE CREDIT", { credit: 1951059.1 }),
        line("NEFT/EB/AXOEB EMPLOYEE SALARY PAYROLL", { debit: 1323356 }),
        line("PAYMENT TO HIREN", { debit: 55930 }),
        line("PAYMENT TO PARTH", { debit: 95620 }),
        line("CBDT PAYMENT", { debit: 76375 }),
      ],
      policyRulesForPrefix("NQ"),
    );

    expect(nq.revenue).toBe(1951059.1);
    expect(nq.bankPaidSalaries).toBe(1323356);
    expect(nq.otherBusinessExpenses).toBe(55930 + 95620);
    expect(nq.cbdtBusinessTax).toBe(76375);
    expect(nq.earnedOperatingProfit).toBe(EXPECTED.nqEarned);
  });

  it("combines earned profit and cash-remaining ladder without altering earned totals", () => {
    const nw = summarizeEarnedProfit(
      [
        line("SANA LIFE SCIENCE", { credit: 1954189.09 }),
        line("SKYDOTEC", { credit: 146169.51 }),
        line("NEFT/EB/SALARY OVERTIME", { debit: 1199421 }),
        line("MOB/TPFT/LOVE N CHAUHAN/CASH", { debit: 100000 }),
        line("CBDT", { debit: 53112 }),
        line("HOME LOAN", { debit: 63220 }),
        line("BAJAJ EMI", { debit: 53137 }),
        line("CREDIT CARD PAYMENT", { debit: 56327.76 }),
        line("TRANSFER TO LOVE SHIVANI", { debit: 172000 }),
        line("THREADS CHEQUE", { debit: 77500 }),
      ],
      policyRulesForPrefix("NW"),
    );

    const nq = summarizeEarnedProfit(
      [
        line("SANA LIFE SCIENCE", { credit: 1951059.1 }),
        line("NEFT/EB/SALARY OVERTIME", { debit: 1323356 }),
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
    const assignment = resolveProfitAssignment("NEFT/EB/SALARY BATCH FROM CLIENT", "REVENUE", rules, {
      credit: 1000,
      debit: 0,
    });
    expect(assignment.matchedBy).toBe("manual_classification");
    expect(assignment.categoryKey).toBe("REVENUE");

    const summary = summarizeEarnedProfit(
      [line("NEFT/EB/SALARY BATCH FROM CLIENT", { credit: 1000 }, "REVENUE")],
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

  it("requires credit direction for Sana Life Science revenue", () => {
    const rules = policyRulesForPrefix("NW");
    const asDebit = resolveProfitAssignment(
      "NEFT/SANA LIFE SCIENCE LTD/REFUND",
      "UNCLASSIFIED",
      rules,
      { debit: 5000, credit: 0 },
    );
    expect(asDebit.categoryKey).not.toBe("REVENUE");

    const asCredit = resolveProfitAssignment(
      "NEFT/SANA LIFE SCIENCE LTD/INW",
      "UNCLASSIFIED",
      rules,
      { debit: 0, credit: 5000 },
    );
    expect(asCredit.categoryKey).toBe("REVENUE");
  });
});

describe("Nova Workforce April 2025 reconciliation fixture", () => {
  it("yields ₹2,84,428.27 earned profit with Sana credit and correct buckets", () => {
    const summary = summarizeEarnedProfit(april2025NwLines(), policyRulesForPrefix("NW"));

    expect(summary.revenue).toBe(1171876.27);
    expect(summary.bankPaidSalaries).toBe(744765);
    expect(summary.overtime).toBe(0);
    expect(summary.salaryRelatedCashPayments).toBe(100000);
    expect(summary.cbdtBusinessTax).toBe(42683);
    expect(summary.earnedOperatingProfit).toBe(EXPECTED.april2025NwEarned);
    expect(summary.reconciliationStatus).toBe("PARTIAL_REVIEW_REQUIRED");

    // AMC must not silently alter earned profit.
    expect(summary.unclassified.count).toBe(1);
    expect(summary.unclassified.totalDebit).toBe(2211);
    expect(summary.unclassified.lines[0]?.particulars).toMatch(/AHMEDABAD MUNICIPAL/i);

    // HARDIKKUMAR must be salary, not cash-salary.
    const hardikkumar = summary.lines.find((l) => /HARDIKKUMAR/i.test(l.particulars));
    expect(hardikkumar?.financeTreatment).toBe("SALARY");
    expect(hardikkumar?.categoryKey).toBe("SALARY");

    const loveCash = summary.lines.find((l) => /TPFT\/LOVE N CHAUHAN/i.test(l.particulars));
    expect(loveCash?.financeTreatment).toBe("SALARY_RELATED_CASH");

    const sana = summary.lines.find((l) => /SANA LIFE/i.test(l.particulars));
    expect(sana?.financeTreatment).toBe("REVENUE");
    expect(sana?.credit).toBe(1171876.27);
    expect(sana?.debit).toBe(0);
  });

  it("fails if revenue credit is missing from the month calculation", () => {
    const withoutSana = april2025NwLines().filter((l) => !/SANA LIFE/i.test(l.particulars));
    const broken = summarizeEarnedProfit(withoutSana, policyRulesForPrefix("NW"));
    expect(broken.revenue).toBe(0);
    expect(broken.earnedOperatingProfit).toBeLessThan(0);
    // Guard: real April fixture must not look like this.
    const full = summarizeEarnedProfit(april2025NwLines(), policyRulesForPrefix("NW"));
    expect(full.revenue).toBeGreaterThan(0);
    expect(full.earnedOperatingProfit).toBe(EXPECTED.april2025NwEarned);
  });
});

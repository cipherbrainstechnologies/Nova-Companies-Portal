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
  /** April 2025 NW: revenue − salaries − internet tax − municipal (Love is owner outflow). */
  april2025NwEarned: 382217.27,
  april2025OwnerOutflow: 100000,
  april2025Municipal: 2211,
  april2025Closing: 1358340.11,
  april2025NetBank: 282217.27,
} as const;

/** April 2025 Nova Workforce statement lines (Axis Account Statement Report). */
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
    line("NEFT/EB/AXOEB09099177118/SUTHAR HARDIKKUMAR/HDFC BANK///////", { debit: 91467 }),
    // Confirmed owner outflow — NOT Hardik cash salary.
    line("MOB/TPFT/LOVE N CHAUHAN/915010062717599", { debit: 100000 }),
    line("INB/101373511/INTERNET TAX PAYMENT/", { debit: 42683 }),
    line(
      "NEFT/HDFCH00197712907/SANA LIFE SCIENCE LTD/HDFC BANK/0001Foreign INR INW PACB remi",
      { credit: 1171876.27 },
    ),
    // Confirmed company municipal expense.
    line("NBSM/102369041/AHMEDABAD MUNICIPAL CORPORATION(PA", { debit: 2211 }),
  ];
}

describe("mandatory earned profit policy fixtures", () => {
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

  it("treats Love transfers as owner outflow, not Hardik cash salary", () => {
    const summary = summarizeEarnedProfit(
      [line("MOB/TPFT/LOVE N CHAUHAN/915010062717599", { debit: 100000 })],
      policyRulesForPrefix("NW"),
    );
    expect(summary.salaryRelatedCashPayments).toBe(0);
    expect(summary.personalFinancing.ownerTransfers).toBe(100000);
    expect(summary.earnedOperatingProfit).toBe(0);
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

  it("lets manual classification override narration rules", () => {
    const rules = policyRulesForPrefix("NW");
    const assignment = resolveProfitAssignment("NEFT/EB/SALARY BATCH FROM CLIENT", "REVENUE", rules, {
      credit: 1000,
      debit: 0,
    });
    expect(assignment.matchedBy).toBe("manual_classification");
    expect(assignment.categoryKey).toBe("REVENUE");
  });
});

describe("Nova Workforce April 2025 reconciliation fixture", () => {
  it("yields ₹3,82,217.27 earned profit with Love as owner outflow", () => {
    const summary = summarizeEarnedProfit(april2025NwLines(), policyRulesForPrefix("NW"));

    expect(summary.revenue).toBe(1171876.27);
    expect(summary.bankPaidSalaries).toBe(744765);
    expect(summary.overtime).toBe(0);
    expect(summary.salaryRelatedCashPayments).toBe(0);
    expect(summary.cbdtBusinessTax).toBe(42683);
    expect(summary.otherBusinessExpenses).toBe(EXPECTED.april2025Municipal);
    expect(summary.earnedOperatingProfit).toBe(EXPECTED.april2025NwEarned);
    expect(summary.personalFinancing.ownerTransfers).toBe(EXPECTED.april2025OwnerOutflow);
    expect(summary.reconciliationStatus).toBe("COMPLETE");

    const love = summary.lines.find((l) => /TPFT\/LOVE N CHAUHAN/i.test(l.particulars));
    expect(love?.financeTreatment).toBe("OWNER_TRANSFER");

    const municipal = summary.lines.find((l) => /MUNICIPAL/i.test(l.particulars));
    expect(municipal?.financeTreatment).toBe("OTHER_BUSINESS_EXPENSE");

    const sana = summary.lines.find((l) => /SANA LIFE/i.test(l.particulars));
    expect(sana?.financeTreatment).toBe("REVENUE");
    expect(sana?.credit).toBe(1171876.27);
  });

  it("fails if revenue credit is omitted from the month", () => {
    const withoutSana = april2025NwLines().filter((l) => !/SANA LIFE/i.test(l.particulars));
    const broken = summarizeEarnedProfit(withoutSana, policyRulesForPrefix("NW"));
    expect(broken.revenue).toBe(0);
    expect(broken.earnedOperatingProfit).toBeLessThan(0);
    const full = summarizeEarnedProfit(april2025NwLines(), policyRulesForPrefix("NW"));
    expect(full.earnedOperatingProfit).toBe(EXPECTED.april2025NwEarned);
  });
});

describe("combineProfitSummaries", () => {
  it("sums company earned profits without re-running cross-company rules", () => {
    const a = summarizeEarnedProfit(
      [line("SANA LIFE SCIENCE", { credit: 100 }), line("NEFT/EB/PAY", { debit: 40 })],
      policyRulesForPrefix("NW"),
    );
    const b = summarizeEarnedProfit(
      [line("SANA LIFE SCIENCE", { credit: 50 }), line("NEFT/EB/PAY", { debit: 10 })],
      policyRulesForPrefix("NQ"),
    );
    const combined = combineProfitSummaries(a, b);
    expect(combined.earnedOperatingProfit).toBe(100);
    expect(combined.revenue).toBe(150);
  });
});

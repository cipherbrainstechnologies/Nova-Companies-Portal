import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AxisBankPdfParser } from "@/server/statements/axis-bank-pdf-parser";
import { validateStatementBalances } from "@/server/finance/finance-ledger";
import { policyRulesForPrefix, summarizeEarnedProfit } from "@/server/finance/profit-engine";

describe("WORKFORCE-1.PDF April 2025 end-to-end classification", () => {
  const pdfPath = join(process.cwd(), "upload", "WORKFORCE-1.PDF");

  it("parses Sana credit and yields ₹3,82,217.27 earned profit for April 2025", async () => {
    if (!existsSync(pdfPath)) {
      expect(existsSync(pdfPath)).toBe(false);
      return;
    }

    const buffer = readFileSync(pdfPath);
    const parsed = await new AxisBankPdfParser().parse({
      buffer,
      mimeType: "application/pdf",
      originalName: "WORKFORCE-1.PDF",
    });

    const check = validateStatementBalances(parsed);
    expect(check.openingBalance).toBe(1076122.84);
    expect(check.statementClosingBalance).toBe(2063057.84);
    expect(check.statementReconciled).toBe(true);

    const april = parsed.transactions.filter(
      (t) => t.txnDate.getUTCFullYear() === 2025 && t.txnDate.getUTCMonth() === 3,
    );
    expect(april.length).toBe(15);

    const credits = april.filter((t) => (t.credit ?? 0) > 0);
    const debits = april.filter((t) => (t.debit ?? 0) > 0);
    expect(credits).toHaveLength(1);
    expect(credits[0]?.credit).toBe(1171876.27);
    expect(debits).toHaveLength(14);

    const summary = summarizeEarnedProfit(
      april.map((t) => ({
        particulars: t.particulars,
        debit: t.debit ?? 0,
        credit: t.credit ?? 0,
        classification: "UNCLASSIFIED" as const,
      })),
      policyRulesForPrefix("NW"),
    );

    expect(summary.revenue).toBe(1171876.27);
    expect(summary.bankPaidSalaries).toBe(744765);
    expect(summary.salaryRelatedCashPayments).toBe(0);
    expect(summary.cbdtBusinessTax).toBe(42683);
    expect(summary.otherBusinessExpenses).toBe(2211);
    expect(summary.personalFinancing.ownerTransfers).toBe(100000);
    expect(summary.earnedOperatingProfit).toBe(382217.27);
    expect(summary.reconciliationStatus).toBe("COMPLETE");
  });
});

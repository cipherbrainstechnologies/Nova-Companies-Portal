import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseAxisStatementText } from "@/server/statements/axis-bank-pdf-parser";

describe("AxisBankPdfParser text extraction", () => {
  const text = readFileSync(join(__dirname, "fixtures/axis-sample.txt"), "utf8");
  const reportText = readFileSync(
    join(__dirname, "fixtures/axis-account-statement-report.txt"),
    "utf8",
  );

  it("extracts salary rows despite multi-line narration", () => {
    const parsed = parseAxisStatementText(text);
    expect(parsed.bankCode).toBe("AXIS");
    const jeena = parsed.transactions.find((t) => /JEENA ANN JOHN/i.test(t.particulars));
    const prashant = parsed.transactions.find(
      (t) => /PRASHANT DHAKED/i.test(t.particulars) && /SALARY/i.test(t.particulars),
    );
    const ziaul = parsed.transactions.find((t) => /ZIAUL KADRI/i.test(t.particulars));
    expect(jeena?.debit).toBe(41467);
    expect(prashant?.debit).toBe(28967);
    expect(ziaul?.debit).toBe(113159);
  });

  it("keeps overtime as separate rows", () => {
    const parsed = parseAxisStatementText(text);
    const ot = parsed.transactions.filter((t) => /OVERTIME/i.test(t.particulars));
    expect(ot.length).toBeGreaterThanOrEqual(3);
    expect(ot.some((t) => t.debit === 5256)).toBe(true);
  });

  it("captures non-salary rows for classification", () => {
    const parsed = parseAxisStatementText(text);
    expect(parsed.transactions.some((t) => /CREDIT CARD/i.test(t.particulars))).toBe(true);
    expect(parsed.transactions.some((t) => /HIREN/i.test(t.particulars) && t.debit === 55930)).toBe(
      true,
    );
    expect(parsed.transactions.some((t) => /PARTH/i.test(t.particulars) && t.debit === 95620)).toBe(
      true,
    );
    expect(parsed.transactions.some((t) => /CBDT/i.test(t.particulars) && t.debit === 76375)).toBe(
      true,
    );
  });

  it("parses Axis Account Statement Report rows with S.NO prefix", () => {
    const parsed = parseAxisStatementText(reportText);
    expect(parsed.transactions.length).toBeGreaterThanOrEqual(14);
    expect(parsed.accountHint).toBe("1397");
    expect(parsed.transactions[0]?.debit).toBe(53967);
    expect(parsed.transactions[0]?.balance).toBe(1022155.84);
    const sana = parsed.transactions.find((t) => /SANA LIFE/i.test(t.particulars));
    expect(sana?.credit).toBe(1171876.27);
    expect(sana?.debit).toBeUndefined();
    // Footer totals must not become a transaction.
    expect(parsed.transactions.every((t) => !/TRANSACTION TOTAL/i.test(t.particulars))).toBe(true);
  });
});

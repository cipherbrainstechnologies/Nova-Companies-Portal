import { describe, expect, it } from "vitest";
import {
  resolveTransactionSalaryPeriod,
  salaryPeriodFromDate,
  statementTransactionFingerprint,
} from "@/server/statements/transaction-identity";

describe("salaryPeriodFromDate", () => {
  it("uses calendar month of the date", () => {
    expect(salaryPeriodFromDate(new Date("2026-08-15T10:00:00.000Z"))).toEqual({
      year: 2026,
      month: 8,
    });
  });
});

describe("resolveTransactionSalaryPeriod", () => {
  it("prefers value date over txn date", () => {
    expect(
      resolveTransactionSalaryPeriod({
        txnDate: new Date("2026-07-31T00:00:00.000Z"),
        valueDate: new Date("2026-08-01T00:00:00.000Z"),
      }),
    ).toEqual({ year: 2026, month: 8 });
  });

  it("falls back to statement salary period", () => {
    expect(
      resolveTransactionSalaryPeriod({
        txnDate: new Date("invalid"),
        statementSalaryYear: 2026,
        statementSalaryMonth: 9,
      }),
    ).toEqual({ year: 2026, month: 9 });
  });
});

describe("statementTransactionFingerprint", () => {
  it("dedups identical debits", () => {
    const a = statementTransactionFingerprint({
      txnDate: new Date("2026-08-05T00:00:00.000Z"),
      particulars: "NEFT UTR123 LOVE CHAUHAN",
      debit: 33671,
      credit: null,
    });
    const b = statementTransactionFingerprint({
      txnDate: new Date("2026-08-05T00:00:00.000Z"),
      particulars: "neft utr123   love chauhan",
      debit: 33671,
      credit: null,
    });
    expect(a).toBe(b);
  });

  it("differs when amount changes", () => {
    const a = statementTransactionFingerprint({
      txnDate: new Date("2026-08-05T00:00:00.000Z"),
      particulars: "SALARY",
      debit: 100,
    });
    const b = statementTransactionFingerprint({
      txnDate: new Date("2026-08-05T00:00:00.000Z"),
      particulars: "SALARY",
      debit: 101,
    });
    expect(a).not.toBe(b);
  });
});

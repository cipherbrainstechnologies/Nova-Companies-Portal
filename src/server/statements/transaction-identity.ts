import { createHash } from "crypto";

/** Calendar salary month for a bank debit (value date preferred, else txn date). */
export function salaryPeriodFromDate(date: Date | null | undefined): {
  year: number;
  month: number;
} | null {
  if (!date || Number.isNaN(date.getTime())) return null;
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

export function resolveTransactionSalaryPeriod(input: {
  txnDate: Date;
  valueDate?: Date | null;
  statementSalaryYear?: number | null;
  statementSalaryMonth?: number | null;
}): { year: number; month: number } | null {
  const fromDate = salaryPeriodFromDate(input.valueDate ?? input.txnDate);
  if (fromDate) return fromDate;
  if (
    input.statementSalaryYear != null &&
    input.statementSalaryMonth != null &&
    input.statementSalaryMonth >= 1 &&
    input.statementSalaryMonth <= 12
  ) {
    return { year: input.statementSalaryYear, month: input.statementSalaryMonth };
  }
  return null;
}

/** Stable identity for cross-statement dedup within a company. */
export function statementTransactionFingerprint(input: {
  txnDate: Date;
  particulars: string;
  debit?: number | null;
  credit?: number | null;
  chequeNumber?: string | null;
}): string {
  const y = input.txnDate.getFullYear();
  const m = String(input.txnDate.getMonth() + 1).padStart(2, "0");
  const d = String(input.txnDate.getDate()).padStart(2, "0");
  const day = `${y}-${m}-${d}`;
  const particulars = input.particulars.replace(/\s+/g, " ").trim().toUpperCase();
  const debit = input.debit != null ? Number(input.debit).toFixed(2) : "";
  const credit = input.credit != null ? Number(input.credit).toFixed(2) : "";
  const cheque = (input.chequeNumber ?? "").trim();
  const raw = `${day}|${debit}|${credit}|${cheque}|${particulars}`;
  return createHash("sha256").update(raw).digest("hex");
}

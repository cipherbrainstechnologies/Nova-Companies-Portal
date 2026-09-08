import { assertIdentity, money, roundInr } from "@/server/finance/money";
import type { ParsedStatement, ParsedTxn } from "@/server/statements/types";

export type StatementBalanceCheck = {
  openingBalance: number | null;
  totalCredits: number;
  totalDebits: number;
  calculatedClosingBalance: number | null;
  statementClosingBalance: number | null;
  reconciliationDifference: number | null;
  statementReconciled: boolean;
  transactionCount: number;
  runningBalanceBreaks: number;
};

/**
 * Validate opening + credits − debits = closing, and sequential running balances.
 * Uses Decimal money helpers — never floating-point for assertions.
 */
export function validateStatementBalances(
  parsed: Pick<ParsedStatement, "openingBalance" | "statementClosingBalance" | "transactions">,
): StatementBalanceCheck {
  const transactions = parsed.transactions;
  let totalCredits = money(0);
  let totalDebits = money(0);
  let runningBalanceBreaks = 0;
  let previousBalance =
    parsed.openingBalance != null ? money(parsed.openingBalance) : undefined;

  for (const txn of transactions) {
    const debit = money(txn.debit ?? 0);
    const credit = money(txn.credit ?? 0);
    totalDebits = totalDebits.plus(debit);
    totalCredits = totalCredits.plus(credit);

    if (previousBalance != null && txn.balance != null) {
      const expected = previousBalance.plus(credit).minus(debit);
      if (!expected.toDecimalPlaces(2).equals(money(txn.balance).toDecimalPlaces(2))) {
        runningBalanceBreaks += 1;
      }
      previousBalance = money(txn.balance);
    } else if (txn.balance != null) {
      previousBalance = money(txn.balance);
    } else if (previousBalance != null) {
      previousBalance = previousBalance.plus(credit).minus(debit);
    }
  }

  const opening = parsed.openingBalance != null ? money(parsed.openingBalance) : null;
  const statementClosing =
    parsed.statementClosingBalance != null ? money(parsed.statementClosingBalance) : null;
  const calculatedClosing =
    opening != null ? opening.plus(totalCredits).minus(totalDebits) : previousBalance ?? null;

  let difference: ReturnType<typeof money> | null = null;
  let reconciled = false;
  if (calculatedClosing != null && statementClosing != null) {
    difference = calculatedClosing.minus(statementClosing);
    reconciled = difference.abs().toDecimalPlaces(2).equals(money(0)) && runningBalanceBreaks === 0;
    if (reconciled) {
      assertIdentity("statement.closing", calculatedClosing, statementClosing);
    }
  }

  return {
    openingBalance: opening != null ? roundInr(opening) : null,
    totalCredits: roundInr(totalCredits),
    totalDebits: roundInr(totalDebits),
    calculatedClosingBalance: calculatedClosing != null ? roundInr(calculatedClosing) : null,
    statementClosingBalance: statementClosing != null ? roundInr(statementClosing) : null,
    reconciliationDifference: difference != null ? roundInr(difference) : null,
    statementReconciled: reconciled,
    transactionCount: transactions.length,
    runningBalanceBreaks,
  };
}

export type BankMonthRow = {
  year: number;
  month: number;
  period: string;
  opening: number | null;
  credits: number;
  debits: number;
  netCashMovement: number;
  closing: number | null;
  businessRevenue: number;
  businessExpenses: number;
  earnedProfit: number;
  unclassifiedDebit: number;
  unclassifiedCredit: number;
  provisional: boolean;
  partialMonth: boolean;
  status: "OK" | "PROVISIONAL" | "NO_DATA" | "STATEMENT_FAILED";
};

export type GrowthMetric =
  | "businessRevenue"
  | "businessExpenses"
  | "earnedProfit"
  | "netCashMovement"
  | "closing";

export type GrowthCell = {
  changeAmount: number | null;
  growthPct: number | null;
  label: string;
};

export function periodKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function isPartialMonth(year: number, month: number, asOf = new Date()): boolean {
  // September 2026 through the 8th is the known partial window for this portal.
  if (year === 2026 && month === 9) return true;
  if (year === asOf.getUTCFullYear() && month === asOf.getUTCMonth() + 1) {
    return asOf.getUTCDate() < 28;
  }
  return false;
}

export function computeGrowth(
  current: number | null,
  previous: number | null,
  opts?: { provisional?: boolean; partialMonth?: boolean },
): GrowthCell {
  if (opts?.provisional || opts?.partialMonth) {
    return {
      changeAmount: current != null && previous != null ? roundInr(money(current).minus(previous)) : null,
      growthPct: null,
      label: opts.partialMonth
        ? "N/A — partial month"
        : "N/A — reconciliation incomplete",
    };
  }
  if (current == null || previous == null) {
    return { changeAmount: null, growthPct: null, label: "No data" };
  }
  const changeAmount = roundInr(money(current).minus(previous));
  if (previous === 0) {
    let label = "N/A";
    if (current > 0 && changeAmount !== 0) label = "Turned positive";
    if (current < 0) label = "N/A";
    return { changeAmount, growthPct: null, label };
  }
  if (previous < 0) {
    const label =
      current >= 0 ? "Turned positive" : current > previous ? "Loss reduced" : "Loss widened";
    return { changeAmount, growthPct: null, label };
  }
  const growthPct = roundInr(money(changeAmount).div(Math.abs(previous)).times(100));
  return { changeAmount, growthPct, label: `${growthPct > 0 ? "+" : ""}${growthPct.toFixed(1)}%` };
}

/** Build carry-forward bank ledger months from chronological transactions. */
export function buildBankLedgerMonths(input: {
  openingBalance: number | null;
  transactions: Array<{
    txnDate: Date;
    debit: number;
    credit: number;
  }>;
  asOf?: Date;
}): Array<{
  year: number;
  month: number;
  opening: number | null;
  credits: number;
  debits: number;
  netCashMovement: number;
  closing: number | null;
  partialMonth: boolean;
}> {
  const byMonth = new Map<string, { year: number; month: number; credits: number; debits: number }>();
  for (const txn of input.transactions) {
    const year = txn.txnDate.getUTCFullYear();
    const month = txn.txnDate.getUTCMonth() + 1;
    const key = periodKey(year, month);
    const row = byMonth.get(key) ?? { year, month, credits: 0, debits: 0 };
    row.credits = roundInr(money(row.credits).plus(txn.credit));
    row.debits = roundInr(money(row.debits).plus(txn.debit));
    byMonth.set(key, row);
  }

  const months = [...byMonth.values()].sort(
    (a, b) => a.year - b.year || a.month - b.month,
  );
  let opening = input.openingBalance;
  const result: Array<{
    year: number;
    month: number;
    opening: number | null;
    credits: number;
    debits: number;
    netCashMovement: number;
    closing: number | null;
    partialMonth: boolean;
  }> = [];

  for (const m of months) {
    const net = roundInr(money(m.credits).minus(m.debits));
    const closing =
      opening != null ? roundInr(money(opening).plus(m.credits).minus(m.debits)) : null;
    result.push({
      year: m.year,
      month: m.month,
      opening,
      credits: m.credits,
      debits: m.debits,
      netCashMovement: net,
      closing,
      partialMonth: isPartialMonth(m.year, m.month, input.asOf),
    });
    opening = closing;
  }
  return result;
}

export function sumTxnAmounts(transactions: ParsedTxn[]): {
  credits: number;
  debits: number;
  count: number;
} {
  let credits = money(0);
  let debits = money(0);
  for (const txn of transactions) {
    credits = credits.plus(txn.credit ?? 0);
    debits = debits.plus(txn.debit ?? 0);
  }
  return {
    credits: roundInr(credits),
    debits: roundInr(debits),
    count: transactions.length,
  };
}

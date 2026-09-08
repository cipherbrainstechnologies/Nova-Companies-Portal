import type { ReconciliationStatus } from "@prisma/client";
import { prisma } from "@/server/db";
import { isUnresolvedPaymentStatus } from "@/server/payroll/payment-decision";

export type ReconciliationFilter =
  | "unresolved"
  | "unmatched"
  | "below_expected"
  | "above_expected"
  | "missing_structure"
  | "ambiguous"
  | "resolved"
  | "all";

export type PayrollReconciliationItem = {
  kind: "payroll_line";
  lineId: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  companyId: string;
  companyName: string;
  payrollRunId: string;
  year: number;
  month: number;
  paymentStatus: ReconciliationStatus;
  lineStatus: string;
  expectedAmount: number | null;
  actualAmount: number | null;
  varianceAmount: number | null;
  paymentReference: string | null;
  approvalReason: string | null;
  primaryTxnId: string | null;
  contactIncomplete: boolean;
  matchOutcome: string | null;
  matchExplanation: string | null;
  matchCandidates: Array<{
    transactionId: string;
    identityScore: number;
    debit: number;
    particulars: string;
    txnDate: string;
  }>;
  searchWindowDisplay: string | null;
  transaction: {
    id: string;
    txnDate: string;
    valueDate: string | null;
    particulars: string;
    debit: number | null;
    utrReference: string | null;
    chequeNumber: string | null;
    matchScore: number | null;
    matchExplanation: string | null;
    reviewReason: string | null;
    salaryYear: number | null;
    salaryMonth: number | null;
    reconciliationStatus: ReconciliationStatus;
    suggestions: Array<{
      employeeId: string;
      employeeCode: string;
      employeeName: string;
      score: number;
    }>;
  } | null;
};

export function classifyReconciliationFilter(
  item: Pick<
    PayrollReconciliationItem,
    "paymentStatus" | "varianceAmount" | "expectedAmount" | "transaction"
  >,
): Exclude<ReconciliationFilter, "unresolved" | "all" | "resolved"> | "resolved" {
  if (!isUnresolvedPaymentStatus(item.paymentStatus)) return "resolved";
  if (item.paymentStatus === "SALARY_STRUCTURE_INCOMPLETE") return "missing_structure";
  if (item.paymentStatus === "PARTIAL_PAYMENT_REVIEW_REQUIRED") return "below_expected";
  if (item.paymentStatus === "AMOUNT_MISMATCH_REVIEW_REQUIRED") return "above_expected";
  const suggestions = item.transaction?.suggestions.length ?? 0;
  if (item.paymentStatus === "UNMATCHED" && suggestions > 1) return "ambiguous";
  return "unmatched";
}

export function itemMatchesFilter(
  item: PayrollReconciliationItem,
  filter: ReconciliationFilter,
): boolean {
  if (filter === "all") return true;
  const bucket = classifyReconciliationFilter(item);
  if (filter === "unresolved") return bucket !== "resolved";
  if (filter === "resolved") return bucket === "resolved";
  return bucket === filter;
}

/** Same eligibility as the payroll approval-summary “requiring review” count. */
export async function countUnresolvedPayrollPayments(payrollRunId: string): Promise<number> {
  const lines = await prisma.payrollEmployeeLine.findMany({
    where: { payrollRunId },
    select: { paymentStatus: true },
  });
  return lines.filter((line) => isUnresolvedPaymentStatus(line.paymentStatus)).length;
}

export async function listPayrollReconciliationItems(input: {
  companyId: string;
  payrollRunId: string;
  filter?: ReconciliationFilter;
}): Promise<{
  run: { id: string; year: number; month: number; status: string; companyId: string; companyName: string };
  items: PayrollReconciliationItem[];
  unresolvedCount: number;
  filterCounts: Record<ReconciliationFilter, number>;
}> {
  const run = await prisma.payrollRun.findFirstOrThrow({
    where: { id: input.payrollRunId, companyId: input.companyId },
    include: { company: { select: { id: true, name: true } } },
  });

  const lines = await prisma.payrollEmployeeLine.findMany({
    where: { payrollRunId: run.id },
    include: {
      employee: {
        select: {
          id: true,
          employeeCode: true,
          firstName: true,
          lastName: true,
          displayName: true,
          contact: { select: { primaryPhone: true, personalEmail: true, officialEmail: true } },
        },
      },
      primaryTxn: {
        include: {
          matchSuggestions: {
            include: {
              employee: {
                select: { id: true, employeeCode: true, firstName: true, lastName: true },
              },
            },
            orderBy: { score: "desc" },
            take: 5,
          },
        },
      },
    },
    orderBy: [{ paymentStatus: "asc" }, { createdAt: "asc" }],
  });

  const items: PayrollReconciliationItem[] = lines.map((line) => {
    const contact = line.employee.contact;
    const contactIncomplete =
      !contact?.primaryPhone && !contact?.personalEmail && !contact?.officialEmail;
    const txn = line.primaryTxn;
    const expected = line.expectedAmount != null ? Number(line.expectedAmount) : null;
    const actual =
      line.actualAmount != null
        ? Number(line.actualAmount)
        : txn?.debit != null
          ? Number(txn.debit)
          : null;
    const variance =
      line.varianceAmount != null
        ? Number(line.varianceAmount)
        : expected != null && actual != null
          ? Math.round((actual - expected) * 100) / 100
          : null;

    const snapshot =
      line.calculationSnapshotJson &&
      typeof line.calculationSnapshotJson === "object" &&
      !Array.isArray(line.calculationSnapshotJson)
        ? (line.calculationSnapshotJson as Record<string, unknown>)
        : {};
    const matchRun =
      snapshot.matchRun && typeof snapshot.matchRun === "object"
        ? (snapshot.matchRun as Record<string, unknown>)
        : null;
    const matchCandidates = Array.isArray(matchRun?.candidates)
      ? (matchRun!.candidates as Array<Record<string, unknown>>).slice(0, 5).map((candidate) => ({
          transactionId: String(candidate.transactionId ?? ""),
          identityScore: Number(candidate.identityScore ?? 0),
          debit: Number(candidate.debit ?? 0),
          particulars: String(candidate.particulars ?? ""),
          txnDate: String(candidate.txnDate ?? ""),
        }))
      : [];
    const searchWindow =
      matchRun?.searchWindow && typeof matchRun.searchWindow === "object"
        ? (matchRun.searchWindow as { display?: string }).display ?? null
        : null;

    return {
      kind: "payroll_line",
      lineId: line.id,
      employeeId: line.employeeId,
      employeeCode: line.employee.employeeCode,
      employeeName:
        line.employee.displayName?.trim() ||
        `${line.employee.firstName} ${line.employee.lastName}`.trim(),
      companyId: run.companyId,
      companyName: run.company.name,
      payrollRunId: run.id,
      year: run.year,
      month: run.month,
      paymentStatus: line.paymentStatus,
      lineStatus: line.status,
      expectedAmount: expected,
      actualAmount: actual,
      varianceAmount: variance,
      paymentReference: line.paymentReference,
      approvalReason: line.approvalReason,
      primaryTxnId: line.primaryTxnId,
      contactIncomplete,
      matchOutcome: matchRun?.outcome ? String(matchRun.outcome) : null,
      matchExplanation: matchRun?.explanation ? String(matchRun.explanation) : null,
      matchCandidates,
      searchWindowDisplay: searchWindow,
      transaction: txn
        ? {
            id: txn.id,
            txnDate: txn.txnDate.toISOString(),
            valueDate: txn.valueDate?.toISOString() ?? null,
            particulars: txn.particulars,
            debit: txn.debit != null ? Number(txn.debit) : null,
            utrReference: txn.utrReference,
            chequeNumber: txn.chequeNumber,
            matchScore: txn.matchScore,
            matchExplanation: txn.matchExplanation,
            reviewReason: txn.reviewReason,
            salaryYear: txn.salaryYear,
            salaryMonth: txn.salaryMonth,
            reconciliationStatus: txn.reconciliationStatus,
            suggestions: txn.matchSuggestions.map((suggestion) => ({
              employeeId: suggestion.employee.id,
              employeeCode: suggestion.employee.employeeCode,
              employeeName: `${suggestion.employee.firstName} ${suggestion.employee.lastName}`,
              score: suggestion.score,
            })),
          }
        : null,
    };
  });

  const unresolvedCount = items.filter((item) => isUnresolvedPaymentStatus(item.paymentStatus)).length;

  const filterCounts: Record<ReconciliationFilter, number> = {
    all: items.length,
    unresolved: unresolvedCount,
    unmatched: 0,
    below_expected: 0,
    above_expected: 0,
    missing_structure: 0,
    ambiguous: 0,
    resolved: 0,
  };
  for (const item of items) {
    const bucket = classifyReconciliationFilter(item);
    filterCounts[bucket] += 1;
  }

  const filter = input.filter ?? "unresolved";
  const filtered = items.filter((item) => itemMatchesFilter(item, filter));

  return {
    run: {
      id: run.id,
      year: run.year,
      month: run.month,
      status: run.status,
      companyId: run.companyId,
      companyName: run.company.name,
    },
    items: filtered,
    unresolvedCount,
    filterCounts,
  };
}

/** Candidate bank debits that can still be allocated (not already linked to a payroll line). */
export async function listAllocatableTransactions(input: {
  companyId: string;
  year: number;
  month: number;
}) {
  const periodStart = new Date(Date.UTC(input.year, input.month - 1, 1));
  const periodEnd = new Date(Date.UTC(input.year, input.month, 0, 23, 59, 59, 999));
  const searchStart = new Date(periodStart);
  searchStart.setUTCDate(searchStart.getUTCDate() - 10);
  const searchEnd = new Date(periodEnd);
  searchEnd.setUTCDate(searchEnd.getUTCDate() + 45);

  const linked = await prisma.payrollEmployeeLine.findMany({
    where: { primaryTxnId: { not: null }, payrollRun: { companyId: input.companyId } },
    select: { primaryTxnId: true },
  });
  const used = new Set(linked.map((row) => row.primaryTxnId).filter(Boolean) as string[]);

  const rows = await prisma.statementTransaction.findMany({
    where: {
      statement: { companyId: input.companyId },
      debit: { gt: 0 },
      isDuplicate: false,
      reconciliationStatus: {
        notIn: ["ISSUED", "EMAIL_SENT", "EMAIL_FAILED", "IGNORED", "NON_PAYROLL"],
      },
      OR: [
        { valueDate: { gte: searchStart, lte: searchEnd } },
        { txnDate: { gte: searchStart, lte: searchEnd } },
        { salaryYear: input.year, salaryMonth: input.month },
      ],
    },
    orderBy: [{ valueDate: "asc" }, { txnDate: "asc" }],
    take: 200,
  });

  return rows
    .filter((row) => !used.has(row.id))
    .map((row) => ({
      id: row.id,
      txnDate: row.txnDate.toISOString(),
      particulars: row.particulars,
      debit: row.debit != null ? Number(row.debit) : null,
      utrReference: row.utrReference,
      reconciliationStatus: row.reconciliationStatus,
      salaryYear: row.salaryYear,
      salaryMonth: row.salaryMonth,
    }));
}

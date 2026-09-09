import type { Prisma, ReconciliationStatus, TransactionClassification } from "@prisma/client";
import { prisma } from "@/server/db";
import { writeAudit } from "@/server/audit";
import { extractUtrReference } from "@/server/payroll/payment-decision";
import {
  comparePaymentAmount,
  extractBeneficiaryName,
  IDENTITY_AUTO_LINK_THRESHOLD,
  IDENTITY_COLLISION_MARGIN,
  outcomeFromIdentityAndAmount,
  scoreEmployeeIdentity,
  type MatchOutcomeStatus,
} from "@/server/payroll/identity-matching";
import {
  DEFAULT_PAYMENT_SEARCH_DAYS_AFTER,
  DEFAULT_PAYMENT_SEARCH_DAYS_BEFORE,
  paymentSearchWindow,
  payrollPeriodBounds,
} from "@/server/payroll/period-eligibility";
import { toAmount } from "@/server/payroll/salary-structure";

const PRESERVE_PAYMENT_STATUSES = new Set<ReconciliationStatus>([
  "MANUALLY_MAPPED",
  "APPROVED_FOR_ISSUE",
  "ISSUED",
  "EMAIL_SENT",
  "EMAIL_FAILED",
  "IGNORED",
  "NON_PAYROLL",
]);

const EXCLUDED_CLASSIFICATIONS = new Set<TransactionClassification>([
  "TAX",
  "LOAN_EMI",
  "OWNER_TRANSFER",
  "CREDIT_CARD",
]);

export type MatchRunSummary = {
  status: "completed" | "failed";
  employeesChecked: number;
  transactionsSearched: number;
  transactionsExcluded: number;
  exactMatches: number;
  amountDifferences: number;
  ambiguousMatches: number;
  missingHistoricalSalary: number;
  noCandidates: number;
  identityUncertain: number;
  preservedManual: number;
  autoLinked: number;
  searchWindow: {
    daysBefore: number;
    daysAfter: number;
    searchStart: string;
    searchEnd: string;
    display: string;
  };
  matchedAt: string;
  error?: string;
};

export type PaymentMatchCandidateView = {
  transactionId: string;
  txnDate: string;
  particulars: string;
  debit: number;
  identityScore: number;
  identityExplanation: string;
  amountRelation: string;
  variance: number | null;
  excludedReason?: string;
  outsideWindow?: boolean;
};

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function isLikelyNonSalaryNarration(particulars: string): string | null {
  const upper = particulars.toUpperCase();
  if (/\bCBDT\b/.test(upper) || /\bINCOME\s*TAX\b/.test(upper)) return "tax payment";
  if (/\bGST\b/.test(upper) && !/\bSALARY\b/.test(upper)) return "tax / GST payment";
  if (/\bBAJAJ\b/.test(upper) && /\b(EMI|FINANCE|FINSERV|FIN)\b/.test(upper)) {
    return "loan / financing";
  }
  if (/\bHOME\s*LOAN\b/.test(upper)) return "loan / EMI";
  if (
    /NOVA\s*QORE/.test(upper) &&
    /NOVA\s*WORKFORCE|NOVA\s*WORK\s*FORCE/.test(upper)
  ) {
    return "inter-company transfer";
  }
  if (/\bOWNER\b/.test(upper) && /\bTRANSFER\b/.test(upper)) return "owner transfer";
  return null;
}

function paymentStatusForOutcome(outcome: MatchOutcomeStatus): ReconciliationStatus {
  switch (outcome) {
    case "EXACT_MATCH":
      return "MATCHED_EXACT";
    case "BELOW_EXPECTED_NET":
      return "PARTIAL_PAYMENT_REVIEW_REQUIRED";
    case "ABOVE_EXPECTED_NET":
      return "AMOUNT_MISMATCH_REVIEW_REQUIRED";
    case "HISTORICAL_SALARY_REQUIRED":
      return "SALARY_STRUCTURE_INCOMPLETE";
    case "MULTIPLE_CANDIDATES":
    case "NO_CANDIDATE":
    case "IDENTITY_UNCERTAIN":
    case "PAYMENT_ALREADY_ALLOCATED":
    default:
      return "UNMATCHED";
  }
}

function readSnapshot(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {};
}

/**
 * Shared payroll↔bank matching used by create/populate, statement completion,
 * and “Run Auto-Match Again”. Identity is decided before amount comparison.
 */
export async function runPayrollPaymentMatch(input: {
  actorUserId?: string;
  payrollRunId: string;
  daysBefore?: number;
  daysAfter?: number;
  /** When true, only unmatched/draft lines are reconsidered; approved mappings stay. */
  preserveManual?: boolean;
}): Promise<MatchRunSummary> {
  const preserveManual = input.preserveManual !== false;
  const run = await prisma.payrollRun.findUniqueOrThrow({
    where: { id: input.payrollRunId },
    include: {
      company: { select: { id: true, name: true, matchScoreThreshold: true } },
    },
  });

  const period = payrollPeriodBounds(run.year, run.month);
  const daysBefore = input.daysBefore ?? DEFAULT_PAYMENT_SEARCH_DAYS_BEFORE;
  const daysAfter = input.daysAfter ?? DEFAULT_PAYMENT_SEARCH_DAYS_AFTER;
  const window = paymentSearchWindow(period, { daysBefore, daysAfter });
  const matchedAt = new Date().toISOString();
  const searchWindow = {
    daysBefore,
    daysAfter,
    searchStart: window.searchStart.toISOString(),
    searchEnd: window.searchEnd.toISOString(),
    display: `${formatDisplayDate(window.searchStart)} → ${formatDisplayDate(window.searchEnd)}`,
  };

  try {
    const lines = await prisma.payrollEmployeeLine.findMany({
      where: { payrollRunId: run.id },
      include: {
        employee: {
          include: {
            bankAccount: true,
            paymentAliases: true,
            priorMappings: true,
            salaryStructure: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const allocated = await prisma.payrollEmployeeLine.findMany({
      where: {
        primaryTxnId: { not: null },
        payrollRun: { companyId: run.companyId },
      },
      select: {
        id: true,
        primaryTxnId: true,
        payrollRunId: true,
        paymentStatus: true,
      },
    });
    const allocatedByTxn = new Map(
      allocated
        .filter((row) => row.primaryTxnId)
        .map((row) => [row.primaryTxnId!, row]),
    );

    const rawTxns = await prisma.statementTransaction.findMany({
      where: {
        statement: { companyId: run.companyId },
        debit: { gt: 0 },
        isDuplicate: false,
        OR: [
          { valueDate: { gte: window.searchStart, lte: window.searchEnd } },
          { txnDate: { gte: window.searchStart, lte: window.searchEnd } },
        ],
      },
      orderBy: [{ valueDate: "asc" }, { txnDate: "asc" }],
    });

    let transactionsExcluded = 0;
    const eligibleTxns = [];
    for (const txn of rawTxns) {
      if (EXCLUDED_CLASSIFICATIONS.has(txn.classification)) {
        transactionsExcluded += 1;
        continue;
      }
      const narrationReason = isLikelyNonSalaryNarration(txn.particulars);
      if (narrationReason) {
        transactionsExcluded += 1;
        continue;
      }
      eligibleTxns.push(txn);
    }

    const summary: MatchRunSummary = {
      status: "completed",
      employeesChecked: lines.length,
      transactionsSearched: eligibleTxns.length,
      transactionsExcluded,
      exactMatches: 0,
      amountDifferences: 0,
      ambiguousMatches: 0,
      missingHistoricalSalary: 0,
      noCandidates: 0,
      identityUncertain: 0,
      preservedManual: 0,
      autoLinked: 0,
      searchWindow,
      matchedAt,
    };

    // transactionId → list of { lineId, identityScore, ... } for collision detection
    type Claim = {
      lineId: string;
      employeeId: string;
      identityScore: number;
      identityExplanation: string;
      autoLinkEligible: boolean;
      amount: number;
      expected: number | null;
      historicalSalaryMissing: boolean;
    };
    const claimsByTxn = new Map<string, Claim[]>();
    const lineCandidates = new Map<string, PaymentMatchCandidateView[]>();

    for (const line of lines) {
      if (
        preserveManual &&
        (PRESERVE_PAYMENT_STATUSES.has(line.paymentStatus) ||
          line.status === "APPROVED" ||
          line.status === "ISSUED" ||
          line.status === "ISSUING")
      ) {
        summary.preservedManual += 1;
        continue;
      }

      const employee = line.employee;
      const displayName =
        employee.displayName?.trim() || `${employee.firstName} ${employee.lastName}`.trim();
      const expected =
        toAmount(line.expectedAmount) ??
        toAmount(employee.salaryStructure?.expectedMonthlyNet) ??
        null;
      const historicalSalaryMissing =
        line.paymentStatus === "SALARY_STRUCTURE_INCOMPLETE" || expected == null || expected <= 0;

      const candidates: PaymentMatchCandidateView[] = [];
      for (const txn of eligibleTxns) {
        const existing = allocatedByTxn.get(txn.id);
        if (existing && existing.id !== line.id) {
          continue;
        }
        const identity = scoreEmployeeIdentity(txn.particulars, {
          employeeId: employee.id,
          displayName,
          accountHolderName: employee.bankAccount?.accountHolderName,
          paymentAliases: employee.paymentAliases.map((alias) => alias.alias),
          accountLast4: employee.bankAccount?.accountLast4,
          priorNormalizedNames: employee.priorMappings.map((mapping) => mapping.normalizedName),
        });
        if (identity.score <= 0) continue;

        const amount = Number(txn.debit);
        const { relation, variance } = comparePaymentAmount(amount, expected);
        candidates.push({
          transactionId: txn.id,
          txnDate: (txn.valueDate ?? txn.txnDate).toISOString(),
          particulars: txn.particulars,
          debit: amount,
          identityScore: identity.score,
          identityExplanation: identity.explanation,
          amountRelation: relation,
          variance,
        });

        if (identity.autoLinkEligible) {
          const list = claimsByTxn.get(txn.id) ?? [];
          list.push({
            lineId: line.id,
            employeeId: employee.id,
            identityScore: identity.score,
            identityExplanation: identity.explanation,
            autoLinkEligible: true,
            amount,
            expected,
            historicalSalaryMissing,
          });
          claimsByTxn.set(txn.id, list);
        }
      }

      candidates.sort((a, b) => b.identityScore - a.identityScore || a.debit - b.debit);
      lineCandidates.set(line.id, candidates.slice(0, 8));
    }

    // Resolve unique claims; mark collisions as MULTIPLE_CANDIDATES.
    const winningClaimByLine = new Map<string, { txnId: string; claim: Claim; unique: boolean }>();
    const contestedTxnIds = new Set<string>();

    for (const [txnId, claims] of claimsByTxn) {
      claims.sort((a, b) => b.identityScore - a.identityScore);
      const best = claims[0];
      const second = claims[1];
      const unique =
        !second || best.identityScore - second.identityScore >= IDENTITY_COLLISION_MARGIN;
      if (!unique) {
        contestedTxnIds.add(txnId);
        for (const claim of claims) {
          winningClaimByLine.set(claim.lineId, { txnId, claim, unique: false });
        }
        continue;
      }
      // One txn → one employee. If that employee already has a better winning txn, keep better.
      const previous = winningClaimByLine.get(best.lineId);
      if (!previous || best.identityScore > previous.claim.identityScore) {
        winningClaimByLine.set(best.lineId, { txnId, claim: best, unique: true });
      }
    }

    // Ensure a txn is not assigned to two lines after per-line best selection.
    const claimedTxns = new Map<string, string>();
    const orderedWins = [...winningClaimByLine.entries()].sort(
      (a, b) => b[1].claim.identityScore - a[1].claim.identityScore,
    );
    const finalWins = new Map<string, { txnId: string; claim: Claim; unique: boolean }>();
    for (const [lineId, win] of orderedWins) {
      if (!win.unique) {
        finalWins.set(lineId, win);
        continue;
      }
      if (claimedTxns.has(win.txnId)) {
        finalWins.set(lineId, { ...win, unique: false });
        contestedTxnIds.add(win.txnId);
        continue;
      }
      claimedTxns.set(win.txnId, lineId);
      finalWins.set(lineId, win);
    }

    for (const line of lines) {
      if (
        preserveManual &&
        (PRESERVE_PAYMENT_STATUSES.has(line.paymentStatus) ||
          line.status === "APPROVED" ||
          line.status === "ISSUED" ||
          line.status === "ISSUING")
      ) {
        continue;
      }

      const candidates = lineCandidates.get(line.id) ?? [];
      const win = finalWins.get(line.id);
      const expected =
        toAmount(line.expectedAmount) ??
        toAmount(line.employee.salaryStructure?.expectedMonthlyNet) ??
        null;
      const historicalSalaryMissing =
        line.paymentStatus === "SALARY_STRUCTURE_INCOMPLETE" || expected == null || expected <= 0;

      let outcome: MatchOutcomeStatus;
      let autoLink = false;
      let linkedTxnId: string | null = null;
      let actualAmount: number | null = null;
      let varianceAmount: number | null = null;
      let explanation = "Not run yet";

      if (!candidates.length) {
        outcome = "NO_CANDIDATE";
        explanation = "No identity candidates in the payment search window";
        summary.noCandidates += 1;
      } else if (win && !win.unique) {
        outcome = "MULTIPLE_CANDIDATES";
        explanation = `Ambiguous identity for ${extractBeneficiaryName(candidates[0]?.particulars ?? "")}; requires review`;
        summary.ambiguousMatches += 1;
      } else if (win && win.unique) {
        const { relation, variance } = comparePaymentAmount(win.claim.amount, expected);
        outcome = outcomeFromIdentityAndAmount({
          identityScore: win.claim.identityScore,
          unique: true,
          amountRelation: relation,
          historicalSalaryMissing,
          alreadyAllocated: false,
          autoLinkEligible: win.claim.autoLinkEligible,
        });
        explanation = win.claim.identityExplanation;
        autoLink = true;
        linkedTxnId = win.txnId;
        actualAmount = win.claim.amount;
        varianceAmount = variance;
        if (outcome === "EXACT_MATCH") summary.exactMatches += 1;
        else if (outcome === "BELOW_EXPECTED_NET" || outcome === "ABOVE_EXPECTED_NET") {
          summary.amountDifferences += 1;
        } else if (outcome === "HISTORICAL_SALARY_REQUIRED") {
          summary.missingHistoricalSalary += 1;
        }
      } else {
        const top = candidates[0];
        outcome =
          top.identityScore >= IDENTITY_AUTO_LINK_THRESHOLD
            ? "MULTIPLE_CANDIDATES"
            : top.identityScore >= 40
              ? "IDENTITY_UNCERTAIN"
              : "NO_CANDIDATE";
        explanation = top.identityExplanation;
        if (outcome === "NO_CANDIDATE") summary.noCandidates += 1;
        else if (outcome === "IDENTITY_UNCERTAIN") summary.identityUncertain += 1;
        else summary.ambiguousMatches += 1;
      }

      const paymentStatus = paymentStatusForOutcome(outcome);
      const snapshot = readSnapshot(line.calculationSnapshotJson);
      snapshot.matchRun = {
        outcome,
        explanation,
        identityThreshold: IDENTITY_AUTO_LINK_THRESHOLD,
        searchWindow,
        matchedAt,
        candidates,
        autoLinked: autoLink,
      };

      // Clear prior auto-link when re-running, but never steal a preserved manual link.
      const nextPrimary =
        autoLink && linkedTxnId
          ? linkedTxnId
          : line.primaryTxnId && PRESERVE_PAYMENT_STATUSES.has(line.paymentStatus)
            ? line.primaryTxnId
            : autoLink
              ? linkedTxnId
              : null;

      try {
        await prisma.payrollEmployeeLine.update({
          where: { id: line.id },
          data: {
            primaryTxnId: nextPrimary,
            paymentStatus:
              nextPrimary && autoLink
                ? paymentStatus
                : historicalSalaryMissing && !nextPrimary
                  ? "SALARY_STRUCTURE_INCOMPLETE"
                  : nextPrimary
                    ? line.paymentStatus
                    : paymentStatus,
            actualAmount: autoLink ? actualAmount : nextPrimary ? line.actualAmount : null,
            varianceAmount: autoLink ? varianceAmount : nextPrimary ? line.varianceAmount : null,
            expectedAmount: expected ?? line.expectedAmount,
            paymentReference: autoLink
              ? extractUtrReference(
                  candidates.find((c) => c.transactionId === linkedTxnId)?.particulars ?? "",
                ) ?? null
              : line.paymentReference,
            approvalReason:
              outcome === "HISTORICAL_SALARY_REQUIRED"
                ? "Historical salary review required"
                : line.approvalReason,
            calculationSnapshotJson: snapshot as Prisma.InputJsonValue,
          },
        });
        if (autoLink && linkedTxnId) {
          summary.autoLinked += 1;
          allocatedByTxn.set(linkedTxnId, {
            id: line.id,
            primaryTxnId: linkedTxnId,
            payrollRunId: run.id,
            paymentStatus,
          });
          await prisma.statementTransaction.update({
            where: { id: linkedTxnId },
            data: {
              matchedEmployeeId: line.employeeId,
              matchScore: win?.claim.identityScore ?? null,
              matchExplanation: explanation,
              expectedAmount: expected,
              actualAmount,
              varianceAmount,
              salaryYear: run.year,
              salaryMonth: run.month,
              reconciliationStatus: paymentStatus,
            },
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (message.includes("Unique constraint") || message.includes("primaryTxnId")) {
          const snapshotFailed = readSnapshot(line.calculationSnapshotJson);
          snapshotFailed.matchRun = {
            outcome: "PAYMENT_ALREADY_ALLOCATED",
            explanation: "Payment already allocated to another payroll line",
            searchWindow,
            matchedAt,
            candidates,
            autoLinked: false,
          };
          await prisma.payrollEmployeeLine.update({
            where: { id: line.id },
            data: {
              paymentStatus: "UNMATCHED",
              calculationSnapshotJson: snapshotFailed as Prisma.InputJsonValue,
            },
          });
        } else {
          throw error;
        }
      }
    }

    await prisma.payrollRun.update({
      where: { id: run.id },
      data: {
        status:
          summary.autoLinked === lines.length && summary.amountDifferences === 0
            ? "READY_FOR_REVIEW"
            : "RECONCILIATION_REQUIRED",
      },
    });

    await writeAudit({
      actorUserId: input.actorUserId,
      companyId: run.companyId,
      action: "payroll.payment_auto_match",
      entityType: "PayrollRun",
      entityId: run.id,
      metadata: summary,
    });

    return summary;
  } catch (error) {
    const failed: MatchRunSummary = {
      status: "failed",
      employeesChecked: 0,
      transactionsSearched: 0,
      transactionsExcluded: 0,
      exactMatches: 0,
      amountDifferences: 0,
      ambiguousMatches: 0,
      missingHistoricalSalary: 0,
      noCandidates: 0,
      identityUncertain: 0,
      preservedManual: 0,
      autoLinked: 0,
      searchWindow,
      matchedAt,
      error: error instanceof Error ? error.message : "Auto-match failed",
    };
    await writeAudit({
      actorUserId: input.actorUserId,
      companyId: run.companyId,
      action: "payroll.payment_auto_match_failed",
      entityType: "PayrollRun",
      entityId: run.id,
      metadata: failed,
    });
    return failed;
  }
}

export async function listPreferredAllocatableTransactions(input: {
  companyId: string;
  year: number;
  month: number;
  daysBefore?: number;
  daysAfter?: number;
  employeeId?: string;
}) {
  const period = payrollPeriodBounds(input.year, input.month);
  const window = paymentSearchWindow(period, {
    daysBefore: input.daysBefore,
    daysAfter: input.daysAfter,
  });
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
    },
    orderBy: [{ valueDate: "desc" }, { txnDate: "desc" }],
    take: 2000,
  });

  return rows
    .filter((row) => !used.has(row.id))
    .map((row) => {
      const when = row.valueDate ?? row.txnDate;
      const inWindow = when >= window.searchStart && when <= window.searchEnd;
      const classExcluded = EXCLUDED_CLASSIFICATIONS.has(row.classification);
      const narrationReason = isLikelyNonSalaryNarration(row.particulars);
      let excludedReason: string | undefined;
      if (classExcluded) excludedReason = `classified as ${row.classification}`;
      else if (narrationReason) excludedReason = narrationReason;
      else if (!inWindow) excludedReason = "outside payment search window";
      return {
        id: row.id,
        txnDate: row.txnDate.toISOString(),
        valueDate: row.valueDate?.toISOString() ?? null,
        displayDate: formatDisplayDate(when),
        particulars: row.particulars,
        debit: row.debit != null ? Number(row.debit) : null,
        utrReference: row.utrReference,
        reconciliationStatus: row.reconciliationStatus,
        inWindow,
        preferred: inWindow && !excludedReason,
        excludedReason,
        beneficiary: extractBeneficiaryName(row.particulars),
      };
    })
    .sort((a, b) => Number(b.preferred) - Number(a.preferred) || b.txnDate.localeCompare(a.txnDate));
}

export type PaymentSearchResult = {
  id: string;
  txnDate: string;
  displayDate: string;
  particulars: string;
  beneficiary: string;
  debit: number | null;
  utrReference: string | null;
  reconciliationStatus: string;
  preferred: boolean;
  inWindow: boolean;
  excludedReason?: string;
  matchExplanation: string;
  allocationStatus: string;
  recommended: boolean;
};

function amountQueryVariants(query: string): number[] {
  const compact = query.replace(/[₹,\s]/g, "");
  if (!/^\d+(\.\d+)?$/.test(compact)) return [];
  const value = Number(compact);
  return Number.isFinite(value) ? [value] : [];
}

/**
 * Server-side searchable payment list for the reconciliation combobox.
 * Searches all company debit rows (not a truncated first page only).
 */
export async function searchAllocatablePayments(input: {
  companyId: string;
  year: number;
  month: number;
  query?: string;
  employeeId?: string;
  employeeName?: string;
  daysBefore?: number;
  daysAfter?: number;
  includeAllocated?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{ results: PaymentSearchResult[]; total: number; hasMore: boolean }> {
  const period = payrollPeriodBounds(input.year, input.month);
  const window = paymentSearchWindow(period, {
    daysBefore: input.daysBefore,
    daysAfter: input.daysAfter,
  });
  const linked = await prisma.payrollEmployeeLine.findMany({
    where: { primaryTxnId: { not: null }, payrollRun: { companyId: input.companyId } },
    select: { primaryTxnId: true, employeeId: true },
  });
  const usedByTxn = new Map(
    linked
      .filter((row) => row.primaryTxnId)
      .map((row) => [row.primaryTxnId!, row.employeeId]),
  );

  const rows = await prisma.statementTransaction.findMany({
    where: {
      statement: { companyId: input.companyId },
      debit: { gt: 0 },
      isDuplicate: false,
    },
    orderBy: [{ valueDate: "desc" }, { txnDate: "desc" }],
  });

  const q = (input.query ?? "").trim().toLowerCase();
  const amountHits = amountQueryVariants(input.query ?? "");
  const employeeName = input.employeeName ?? "";

  const mapped: PaymentSearchResult[] = [];
  for (const row of rows) {
    const allocatedTo = usedByTxn.get(row.id);
    if (allocatedTo && !input.includeAllocated && allocatedTo !== input.employeeId) {
      continue;
    }
    const when = row.valueDate ?? row.txnDate;
    const inWindow = when >= window.searchStart && when <= window.searchEnd;
    const classExcluded = EXCLUDED_CLASSIFICATIONS.has(row.classification);
    const narrationReason = isLikelyNonSalaryNarration(row.particulars);
    let excludedReason: string | undefined;
    if (classExcluded) excludedReason = `classified as ${row.classification}`;
    else if (narrationReason) excludedReason = narrationReason;
    else if (!inWindow) excludedReason = "outside payment search window";

    const beneficiary = extractBeneficiaryName(row.particulars);
    const debit = row.debit != null ? Number(row.debit) : null;
    const identity = employeeName
      ? scoreEmployeeIdentity(row.particulars, {
          employeeId: input.employeeId ?? "",
          displayName: employeeName,
        })
      : null;

    const matchExplanation = excludedReason
      ? `Excluded: ${excludedReason}`
      : identity && identity.score > 0
        ? identity.explanation
        : inWindow
          ? "In payment search window"
          : "Eligible debit";

    const haystack = [
      beneficiary,
      row.particulars,
      row.utrReference ?? "",
      debit != null ? String(debit) : "",
      debit != null ? debit.toLocaleString("en-IN") : "",
      formatDisplayDate(when),
    ]
      .join(" ")
      .toLowerCase();

    if (q) {
      const textHit = haystack.includes(q) || beneficiary.toLowerCase().includes(q);
      const amountHit =
        amountHits.length > 0 && debit != null && amountHits.some((v) => Math.abs(debit - v) < 0.01);
      if (!textHit && !amountHit) continue;
    }

    const recommended =
      !excludedReason &&
      inWindow &&
      ((identity?.autoLinkEligible ?? false) || (identity?.score ?? 0) >= 40);

    mapped.push({
      id: row.id,
      txnDate: row.txnDate.toISOString(),
      displayDate: formatDisplayDate(when),
      particulars: row.particulars,
      beneficiary,
      debit,
      utrReference: row.utrReference,
      reconciliationStatus: row.reconciliationStatus,
      preferred: inWindow && !excludedReason,
      inWindow,
      excludedReason,
      matchExplanation,
      allocationStatus: allocatedTo
        ? allocatedTo === input.employeeId
          ? "Allocated to this employee"
          : "Allocated to another employee"
        : row.reconciliationStatus === "UNMATCHED"
          ? "Unallocated"
          : row.reconciliationStatus,
      recommended,
    });
  }

  mapped.sort(
    (a, b) =>
      Number(b.recommended) - Number(a.recommended) ||
      Number(b.preferred) - Number(a.preferred) ||
      b.txnDate.localeCompare(a.txnDate),
  );

  const limit = Math.min(100, Math.max(10, input.limit ?? 40));
  const offset = Math.max(0, input.offset ?? 0);
  const slice = mapped.slice(offset, offset + limit);
  return { results: slice, total: mapped.length, hasMore: offset + limit < mapped.length };
}

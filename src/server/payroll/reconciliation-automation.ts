import type { ReconciliationStatus, VarianceClassification } from "@prisma/client";
import { prisma } from "@/server/db";
import { writeAudit } from "@/server/audit";
import { PAYROLL_AUDIT_ACTIONS } from "@/server/payroll/audit-actions";
import {
  buildMatchExplanation,
  decidePaymentAutomation,
  extractUtrReference,
  type PaymentDecision,
} from "@/server/payroll/payment-decision";
import {
  deriveExpectedMonthlyNet,
  isDuplicatePayrollPeriod,
  isSalaryStructureComplete,
  resolveExpectedMonthlyNet,
  structureToEarningsDeductions,
  toAmount,
  toSalarySnapshot,
} from "@/server/payroll/salary-structure";
import { payrollFacade } from "@/server/payroll/payroll-facade";
import {
  extractBeneficiaryFromParticulars,
  normalizeName,
  rankMatchSuggestions,
  type MatchCandidateInput,
} from "@/server/statements/matching";
import { resolveTransactionSalaryPeriod } from "@/server/statements/transaction-identity";

/** Reviewed or issued rows are never re-decided by the automation pass. */
const TERMINAL_STATUSES: ReconciliationStatus[] = [
  "MANUALLY_MAPPED",
  "NON_PAYROLL",
  "IGNORED",
  "APPROVED_FOR_ISSUE",
  "ISSUED",
  "EMAIL_SENT",
  "EMAIL_FAILED",
];

const COLLISION_MARGIN = 5;

export type ReconciliationReviewAction =
  | "approve"
  | "reject"
  | "map"
  | "ignore"
  | "non_payroll";

export type AutomaticReconciliationSummary = {
  statementId: string;
  evaluated: number;
  counts: Record<string, number>;
  autoIssueCandidates: number;
  autoCreatedLines: number;
  autoIssued: number;
};

type ScoredSuggestion = {
  employeeId: string;
  score: number;
  breakdown: {
    nameSimilarity: number;
    accountLast4: number;
    expectedNetPay: number;
    priorApprovedMapping: number;
    paymentAlias?: number;
  };
};

function readBreakdown(value: unknown): ScoredSuggestion["breakdown"] {
  const record = (value ?? {}) as Record<string, unknown>;
  return {
    nameSimilarity: Number(record.nameSimilarity ?? 0),
    accountLast4: Number(record.accountLast4 ?? 0),
    expectedNetPay: Number(record.expectedNetPay ?? 0),
    priorApprovedMapping: Number(record.priorApprovedMapping ?? 0),
    paymentAlias: Number(record.paymentAlias ?? 0),
  };
}

/**
 * Scores every debit row in a parsed statement against the company's employees.
 *
 * Candidates are always drawn from the statement's own company, so a same-named
 * employee at another company can never be suggested. Names, bank account-holder
 * names and recorded payment aliases all contribute to the score, and the expected
 * net comes from the employee's salary-structure fields.
 */
export async function generateStatementMatchSuggestions(input: {
  companyId: string;
  statementId: string;
  threshold?: number;
  actorUserId?: string;
}) {
  const [company, statement, employees] = await Promise.all([
    prisma.company.findUniqueOrThrow({ where: { id: input.companyId } }),
    prisma.bankStatement.findFirst({
      where: { id: input.statementId, companyId: input.companyId },
      include: {
        transactions: {
          where: { debit: { gt: 0 }, isDuplicate: false },
          orderBy: { rowIndex: "asc" },
        },
      },
    }),
    prisma.employee.findMany({
      where: {
        companyId: input.companyId,
        status: { in: ["ACTIVE", "CONTACT_DETAILS_REQUIRED", "BLOCKED", "EXITED"] },
      },
      include: {
        bankAccount: true,
        salaryStructure: true,
        priorMappings: true,
        paymentAliases: true,
      },
      orderBy: { employeeCode: "asc" },
    }),
  ]);
  if (!statement) throw new Error("Bank statement not found in company scope");
  const threshold = input.threshold ?? company.matchScoreThreshold;

  const suggestions = statement.transactions.flatMap((transaction) => {
    const beneficiary = normalizeName(
      extractBeneficiaryFromParticulars(transaction.particulars),
    );
    const candidates: MatchCandidateInput[] = employees.map((employee) => ({
      employeeId: employee.id,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      accountHolderName: employee.bankAccount?.accountHolderName,
      paymentAliases: employee.paymentAliases.map((alias) => alias.alias),
      accountLast4: employee.bankAccount?.accountLast4,
      expectedNetPay: resolveExpectedMonthlyNet(employee.salaryStructure),
      hasPriorApprovedMapping: employee.priorMappings.some(
        (mapping) => normalizeName(mapping.normalizedName) === beneficiary,
      ),
    }));

    return rankMatchSuggestions(
      { particulars: transaction.particulars, amount: Number(transaction.debit) },
      candidates,
      threshold,
    )
      .filter((suggestion) => suggestion.score > 0)
      .map((suggestion) => ({
        transactionId: transaction.id,
        employeeId: suggestion.employeeId,
        score: suggestion.score,
        status: suggestion.status,
        breakdownJson: suggestion.breakdown,
      }));
  });

  await prisma.$transaction(async (tx) => {
    await tx.statementMatchSuggestion.deleteMany({
      where: { transaction: { statementId: statement.id } },
    });
    if (suggestions.length) {
      await tx.statementMatchSuggestion.createMany({ data: suggestions });
    }
    await tx.auditLog.create({
      data: {
        actorUserId: input.actorUserId ?? null,
        companyId: input.companyId,
        action: PAYROLL_AUDIT_ACTIONS.matchSuggest,
        entityType: "BankStatement",
        entityId: statement.id,
        metadataJson: {
          transactionCount: statement.transactions.length,
          suggestionCount: suggestions.length,
          threshold,
        },
      },
    });
  });

  return suggestions;
}

/**
 * Reconciles a parsed statement against company-scoped employees.
 * Exact / partial / mismatch rows auto-create payroll lines from the saved salary structure.
 * Exact matches auto-issue only when `company.autoIssueExactMatches` is enabled.
 * Partial and mismatch drafts stay invisible to employees until review approval.
 */
export async function applyAutomaticReconciliation(input: {
  actorUserId?: string;
  companyId: string;
  statementId: string;
}): Promise<AutomaticReconciliationSummary> {
  const company = await prisma.company.findUniqueOrThrow({ where: { id: input.companyId } });
  const statement = await prisma.bankStatement.findFirst({
    where: { id: input.statementId, companyId: input.companyId },
    include: {
      transactions: {
        where: { debit: { gt: 0 } },
        orderBy: { rowIndex: "asc" },
        include: {
          payrollLinks: { select: { id: true } },
          matchSuggestions: {
            orderBy: { score: "desc" },
            include: {
              employee: {
                include: { salaryStructure: true },
              },
            },
          },
        },
      },
    },
  });
  if (!statement) throw new Error("Bank statement not found in company scope");

  // Multi-month statements: each debit uses its own calendar month (value/txn date).
  const periodsInStatement = new Set<string>();
  for (const transaction of statement.transactions) {
    const period = resolveTransactionSalaryPeriod({
      txnDate: transaction.txnDate,
      valueDate: transaction.valueDate,
      statementSalaryYear: statement.salaryYear,
      statementSalaryMonth: statement.salaryMonth,
    });
    if (period) periodsInStatement.add(`${period.year}-${period.month}`);
  }

  const existingPeriods =
    periodsInStatement.size > 0
      ? (
          await prisma.payrollEmployeeLine.findMany({
            where: {
              OR: [...periodsInStatement].map((key) => {
                const [year, month] = key.split("-").map(Number);
                return { payrollRun: { companyId: input.companyId, year, month } };
              }),
            },
            select: { employeeId: true, payrollRun: { select: { year: true, month: true } } },
          })
        ).map((line) => ({
          employeeId: line.employeeId,
          year: line.payrollRun.year,
          month: line.payrollRun.month,
        }))
      : [];

  const counts: Record<string, number> = {};
  let autoIssueCandidates = 0;
  let autoCreatedLines = 0;
  let evaluated = 0;
  const autoIssueByRun = new Map<string, { month: number; lineIds: string[] }>();
  const payrollRunByPeriod = new Map<string, string>();

  async function ensurePayrollRun(year: number, month: number): Promise<string> {
    const key = `${year}-${month}`;
    const cached = payrollRunByPeriod.get(key);
    if (cached) return cached;
    const run = await payrollFacade.createPayrollRun({
      actorUserId: input.actorUserId ?? "system",
      companyId: input.companyId,
      year,
      month,
      // Lines for all eligible employees; statement pipeline owns debit assignment.
      matchPayments: false,
    });
    payrollRunByPeriod.set(key, run.id);
    if (!run.statementId) {
      await prisma.payrollRun.update({
        where: { id: run.id },
        data: { statementId: statement!.id, status: "RECONCILIATION_REQUIRED" },
      });
    }
    return run.id;
  }

  for (const transaction of statement.transactions) {
    if (TERMINAL_STATUSES.includes(transaction.reconciliationStatus)) continue;
    if (transaction.isDuplicate) continue;

    const period = resolveTransactionSalaryPeriod({
      txnDate: transaction.txnDate,
      valueDate: transaction.valueDate,
      statementSalaryYear: statement.salaryYear,
      statementSalaryMonth: statement.salaryMonth,
    });
    const salaryYear = period?.year ?? null;
    const salaryMonth = period?.month ?? null;

    if (
      (transaction.salaryYear !== salaryYear || transaction.salaryMonth !== salaryMonth) &&
      salaryYear &&
      salaryMonth
    ) {
      await prisma.statementTransaction.update({
        where: { id: transaction.id },
        data: { salaryYear, salaryMonth },
      });
    }

    const actualAmount = toAmount(transaction.debit) ?? 0;
    const suggestions = transaction.matchSuggestions;
    const top = suggestions[0];
    const runnerUp = suggestions[1];

    const confidentScore =
      !!top && top.score >= company.matchScoreThreshold &&
      (!runnerUp || top.score - runnerUp.score > COLLISION_MARGIN);

    const duplicatePeriod =
      confidentScore && salaryYear != null && salaryMonth != null
        ? isDuplicatePayrollPeriod(existingPeriods, {
            employeeId: top.employeeId,
            year: salaryYear,
            month: salaryMonth,
          })
        : false;

    const matchConfident = confidentScore && !duplicatePeriod;
    const structure = top?.employee.salaryStructure ?? null;
    const structureComplete = matchConfident && isSalaryStructureComplete(structure);
    const expectedMonthlyNet = structure ? deriveExpectedMonthlyNet(structure) : null;

    const decision: PaymentDecision = decidePaymentAutomation({
      matchConfident,
      salaryStructureComplete: structureComplete,
      expectedMonthlyNet,
      actualAmount,
      autoIssueExactMatches: company.autoIssueExactMatches,
    });

    const explanation = top
      ? buildMatchExplanation({
          score: top.score,
          breakdown: readBreakdown(top.breakdownJson),
          beneficiary: extractBeneficiaryFromParticulars(transaction.particulars),
          employeeName: `${top.employee.firstName} ${top.employee.lastName}`,
        })
      : "No company-scoped employee candidate scored above the match threshold";

    const reviewReason = duplicatePeriod
      ? `A payroll line already exists for this employee in ${String(salaryMonth).padStart(2, "0")}/${salaryYear}`
      : !period
        ? "Could not determine salary month for this debit — set statement period or fix transaction date"
        : null;

    await prisma.statementTransaction.update({
      where: { id: transaction.id },
      data: {
        reconciliationStatus: decision.status as ReconciliationStatus,
        matchedEmployeeId: matchConfident ? top!.employeeId : null,
        expectedAmount: decision.expectedAmount,
        actualAmount: decision.actualAmount,
        varianceAmount: decision.varianceAmount,
        matchScore: top?.score ?? null,
        matchExplanation: reviewReason ? `${explanation}; ${reviewReason}` : explanation,
        reviewReason,
        salaryYear,
        salaryMonth,
        classification: decision.status === "UNMATCHED" ? "UNCLASSIFIED" : "SALARY",
        utrReference:
          transaction.utrReference ?? extractUtrReference(transaction.particulars) ?? null,
      },
    });

    counts[decision.status] = (counts[decision.status] ?? 0) + 1;
    if (decision.canAutoIssue) autoIssueCandidates += 1;
    evaluated += 1;

    if (
      !decision.canAutoCreatePayrollLine ||
      !matchConfident ||
      !top ||
      !salaryYear ||
      !salaryMonth ||
      transaction.payrollLinks.length > 0
    ) {
      continue;
    }

    const payrollRunId = await ensurePayrollRun(salaryYear, salaryMonth);
    const derived = structureToEarningsDeductions(structure);
    const snapshot = toSalarySnapshot(structure);
    const line = await payrollFacade.upsertEmployeeLine({
      actorUserId: input.actorUserId ?? "system",
      payrollRunId,
      employeeId: top.employeeId,
      earnings: derived.earnings,
      deductions: derived.deductions,
      primaryTxnId: transaction.id,
    });

    const isExact = decision.status === "MATCHED_EXACT";
    await prisma.payrollEmployeeLine.update({
      where: { id: line.id },
      data: {
        paymentStatus: decision.status as ReconciliationStatus,
        expectedAmount: decision.expectedAmount,
        actualAmount: decision.actualAmount,
        varianceAmount: decision.varianceAmount,
        paymentReference:
          transaction.utrReference ??
          extractUtrReference(transaction.particulars) ??
          transaction.chequeNumber,
        calculationSnapshotJson: snapshot,
        status: isExact ? "APPROVED" : "DRAFT",
        approvedAt: isExact ? new Date() : null,
        approvedById: isExact ? input.actorUserId ?? null : null,
      },
    });
    autoCreatedLines += 1;
    existingPeriods.push({ employeeId: top.employeeId, year: salaryYear, month: salaryMonth });

    if (decision.canAutoIssue) {
      const bucket = autoIssueByRun.get(payrollRunId) ?? { month: salaryMonth, lineIds: [] };
      bucket.lineIds.push(line.id);
      autoIssueByRun.set(payrollRunId, bucket);
      await prisma.statementTransaction.update({
        where: { id: transaction.id },
        data: { reconciliationStatus: "APPROVED_FOR_ISSUE" },
      });
    }
  }

  let autoIssued = 0;
  for (const [payrollRunId, bucket] of autoIssueByRun) {
    await prisma.payrollRun.update({
      where: { id: payrollRunId },
      data: { status: "APPROVED", approvedAt: new Date() },
    });
    try {
      await payrollFacade.issueSelectedPayslips({
        actorUserId: input.actorUserId ?? "system",
        payrollRunId,
        lineIds: bucket.lineIds,
        confirmation: {
          count: bucket.lineIds.length,
          month: bucket.month,
          companyId: input.companyId,
        },
      });
      autoIssued += bucket.lineIds.length;
      await prisma.statementTransaction.updateMany({
        where: { payrollLinks: { some: { id: { in: bucket.lineIds } } } },
        data: { reconciliationStatus: "ISSUED" },
      });
    } catch (error) {
      await writeAudit({
        actorUserId: input.actorUserId,
        companyId: input.companyId,
        action: "payroll.auto_issue_failed",
        entityType: "PayrollRun",
        entityId: payrollRunId,
        metadata: {
          error: error instanceof Error ? error.message : "auto issue failed",
          lineIds: bucket.lineIds,
        },
      });
    }
  }

  await writeAudit({
    actorUserId: input.actorUserId,
    companyId: input.companyId,
    action: PAYROLL_AUDIT_ACTIONS.matchAutoApply,
    entityType: "BankStatement",
    entityId: statement.id,
    metadata: {
      evaluated,
      counts,
      autoIssueCandidates,
      autoCreatedLines,
      autoIssued,
      periods: [...periodsInStatement],
      matchScoreThreshold: company.matchScoreThreshold,
      autoIssueExactMatches: company.autoIssueExactMatches,
    },
  });

  return {
    statementId: statement.id,
    evaluated,
    counts,
    autoIssueCandidates,
    autoCreatedLines,
    autoIssued,
  };
}

const REVIEW_AUDIT_ACTIONS: Record<ReconciliationReviewAction, string> = {
  approve: PAYROLL_AUDIT_ACTIONS.reviewApprove,
  reject: PAYROLL_AUDIT_ACTIONS.reviewReject,
  map: PAYROLL_AUDIT_ACTIONS.reviewMap,
  ignore: PAYROLL_AUDIT_ACTIONS.reviewIgnore,
  non_payroll: PAYROLL_AUDIT_ACTIONS.reviewNonPayroll,
};

/**
 * Applies an operator decision to a single reconciliation row.
 * Approval creates/updates a payroll line from the saved salary structure and marks it
 * ready to issue. Partial/mismatch approvals require variance classification + reason.
 */
export async function reviewReconciliationTransaction(input: {
  actorUserId: string;
  transactionId: string;
  action: ReconciliationReviewAction;
  companyId?: string;
  employeeId?: string;
  varianceClassification?: VarianceClassification;
  reason?: string;
}) {
  const transaction = await prisma.statementTransaction.findUniqueOrThrow({
    where: { id: input.transactionId },
    include: {
      statement: { select: { companyId: true, salaryYear: true, salaryMonth: true, periodEnd: true } },
      matchedEmployee: { include: { salaryStructure: true } },
      payrollLinks: true,
    },
  });
  const companyId = transaction.statement.companyId;
  if (input.companyId && input.companyId !== companyId) {
    throw new Error("Company scope mismatch");
  }

  const reason = input.reason?.trim() || undefined;
  const actualAmount = toAmount(transaction.debit) ?? toAmount(transaction.actualAmount) ?? 0;

  let data: {
    reconciliationStatus: ReconciliationStatus;
    matchedEmployeeId?: string | null;
    expectedAmount?: number | null;
    actualAmount?: number | null;
    varianceAmount?: number | null;
    varianceClassification?: VarianceClassification | null;
    reviewReason?: string | null;
    ignoreReason?: string | null;
    matchExplanation?: string;
  };

  let approvedLineId: string | undefined;

  if (input.action === "map") {
    if (!input.employeeId) throw new Error("An employee is required to map a transaction");
    const employee = await prisma.employee.findFirst({
      where: { id: input.employeeId, companyId },
      include: { salaryStructure: true },
    });
    if (!employee) throw new Error("Employee not found in company scope");

    const expectedAmount = deriveExpectedMonthlyNet(employee.salaryStructure ?? {});
    data = {
      reconciliationStatus: expectedAmount == null ? "SALARY_STRUCTURE_INCOMPLETE" : "MANUALLY_MAPPED",
      matchedEmployeeId: employee.id,
      expectedAmount,
      actualAmount,
      varianceAmount: expectedAmount == null ? null : Math.round((actualAmount - expectedAmount) * 100) / 100,
      reviewReason: reason ?? null,
      matchExplanation: `Manually mapped to ${employee.employeeCode} by operator review`,
    };
  } else if (input.action === "approve") {
    const employeeId = input.employeeId ?? transaction.matchedEmployeeId;
    if (!employeeId) throw new Error("Map the transaction to an employee before approving");
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, companyId },
      include: { salaryStructure: true },
    });
    if (!employee) throw new Error("Employee not found in company scope");
    if (!isSalaryStructureComplete(employee.salaryStructure)) {
      throw new Error("Complete the salary structure before approving this payment");
    }

    const expectedAmount = deriveExpectedMonthlyNet(employee.salaryStructure ?? {});
    const varianceAmount =
      expectedAmount == null ? null : Math.round((actualAmount - expectedAmount) * 100) / 100;
    if (varianceAmount != null && Math.abs(varianceAmount) > 0.01) {
      if (!reason) throw new Error("A reason is required to approve a variance");
      if (!input.varianceClassification) {
        throw new Error("Classify the variance before approving");
      }
    }

    const salaryPeriod = resolveTransactionSalaryPeriod({
      txnDate: transaction.txnDate,
      valueDate: transaction.valueDate,
      statementSalaryYear: transaction.statement.salaryYear,
      statementSalaryMonth: transaction.statement.salaryMonth,
    });
    const salaryYear = salaryPeriod?.year ?? null;
    const salaryMonth = salaryPeriod?.month ?? null;
    if (!salaryYear || !salaryMonth) {
      throw new Error(
        "Could not determine salary month for this debit. Check the transaction date or set an optional statement period on upload.",
      );
    }

    const run = await payrollFacade.createPayrollRun({
      actorUserId: input.actorUserId,
      companyId,
      year: salaryYear,
      month: salaryMonth,
      matchPayments: false,
    });
    const derived = structureToEarningsDeductions(employee.salaryStructure);
    const snapshot = toSalarySnapshot(employee.salaryStructure);
    const line = await payrollFacade.upsertEmployeeLine({
      actorUserId: input.actorUserId,
      payrollRunId: run.id,
      employeeId: employee.id,
      earnings: derived.earnings,
      deductions: derived.deductions,
      primaryTxnId: transaction.id,
    });
    await prisma.payrollEmployeeLine.update({
      where: { id: line.id },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        approvedById: input.actorUserId,
        approvalReason: reason ?? "Approved after reconciliation review",
        paymentStatus: "APPROVED_FOR_ISSUE",
        expectedAmount,
        actualAmount,
        varianceAmount,
        varianceClassification: input.varianceClassification ?? null,
        paymentReference: transaction.utrReference ?? transaction.chequeNumber,
        calculationSnapshotJson: snapshot,
      },
    });
    approvedLineId = line.id;

    const beneficiary = normalizeName(extractBeneficiaryFromParticulars(transaction.particulars));
    if (beneficiary) {
      await prisma.employeeNarrationMapping.upsert({
        where: {
          employeeId_normalizedName: { employeeId: employee.id, normalizedName: beneficiary },
        },
        create: { employeeId: employee.id, normalizedName: beneficiary },
        update: {},
      });
    }

    data = {
      reconciliationStatus: "APPROVED_FOR_ISSUE",
      matchedEmployeeId: employee.id,
      expectedAmount,
      actualAmount,
      varianceAmount,
      varianceClassification: input.varianceClassification ?? null,
      reviewReason: reason ?? null,
    };
  } else if (input.action === "reject") {
    if (!reason) throw new Error("A reason is required to reject a suggested match");
    for (const line of transaction.payrollLinks) {
      if (line.status === "ISSUED" || line.status === "ISSUING") {
        throw new Error("Cannot reject an issued payroll line");
      }
      await prisma.payrollEmployeeLine.update({
        where: { id: line.id },
        data: { status: "CANCELLED" },
      });
    }
    data = {
      reconciliationStatus: "UNMATCHED",
      matchedEmployeeId: null,
      varianceClassification: null,
      reviewReason: reason,
    };
  } else if (input.action === "ignore") {
    if (!reason) throw new Error("A reason is required to ignore a transaction");
    data = {
      reconciliationStatus: "IGNORED",
      matchedEmployeeId: null,
      reviewReason: reason,
      ignoreReason: reason,
    };
  } else {
    if (!reason) throw new Error("A reason is required to mark a transaction non-payroll");
    data = {
      reconciliationStatus: "NON_PAYROLL",
      matchedEmployeeId: null,
      reviewReason: reason,
      ignoreReason: reason,
    };
  }

  const updated = await prisma.statementTransaction.update({
    where: { id: transaction.id },
    data: {
      ...data,
      reviewedById: input.actorUserId,
      reviewedAt: new Date(),
    },
  });

  await writeAudit({
    actorUserId: input.actorUserId,
    companyId,
    action: REVIEW_AUDIT_ACTIONS[input.action],
    entityType: "StatementTransaction",
    entityId: updated.id,
    metadata: {
      action: input.action,
      reconciliationStatus: updated.reconciliationStatus,
      employeeId: updated.matchedEmployeeId,
      varianceAmount: updated.varianceAmount ? Number(updated.varianceAmount) : null,
      varianceClassification: updated.varianceClassification,
      reason: reason ?? null,
      lineId: approvedLineId ?? null,
    },
  });

  return updated;
}

import type { ReconciliationStatus } from "@prisma/client";
import { prisma } from "@/server/db";
import { writeAudit } from "@/server/audit";
import { amountInWordsInr } from "@/server/payroll/amount-in-words";
import {
  decidePaymentAutomation,
  extractUtrReference,
} from "@/server/payroll/payment-decision";
import {
  evaluateEmploymentEligibility,
  paymentSearchWindow,
  payrollPeriodBounds,
  selectEffectiveSalaryStructure,
  summarizePopulateReason,
  type PopulateDiagnostics,
} from "@/server/payroll/period-eligibility";
import {
  isSalaryStructureComplete,
  resolveExpectedMonthlyNet,
  structureToEarningsDeductions,
  toAmount,
  toSalarySnapshot,
  type SalaryStructureRecord,
} from "@/server/payroll/salary-structure";
import {
  extractBeneficiaryFromParticulars,
  normalizeName,
  rankMatchSuggestions,
  type MatchCandidateInput,
} from "@/server/statements/matching";

const EDITABLE_RUN_STATUSES = new Set([
  "DRAFT",
  "PARSING",
  "RECONCILIATION_REQUIRED",
  "READY_FOR_REVIEW",
  "FAILED",
]);

const PRESERVE_LINE_STATUSES = new Set(["APPROVED", "ISSUING", "ISSUED"]);
const PRESERVE_PAYMENT_STATUSES = new Set<ReconciliationStatus>([
  "MANUALLY_MAPPED",
  "APPROVED_FOR_ISSUE",
  "ISSUED",
  "EMAIL_SENT",
  "EMAIL_FAILED",
  "IGNORED",
  "NON_PAYROLL",
]);

const COLLISION_MARGIN = 5;

export type PopulatePayrollResult = {
  payrollRunId: string;
  companyId: string;
  year: number;
  month: number;
  diagnostics: PopulateDiagnostics;
};

function asStructureRecord(row: {
  version?: number | null;
  effectiveFrom: Date | string;
  annualCtc?: unknown;
  monthlyGross?: unknown;
  monthlyTds?: unknown;
  monthlyPt?: unknown;
  expectedMonthlyNet?: unknown;
  componentsJson?: unknown;
  notes?: string | null;
}): SalaryStructureRecord {
  return {
    version: row.version ?? 1,
    effectiveFrom: row.effectiveFrom instanceof Date ? row.effectiveFrom : new Date(row.effectiveFrom),
    annualCtc: row.annualCtc as SalaryStructureRecord["annualCtc"],
    monthlyGross: row.monthlyGross as SalaryStructureRecord["monthlyGross"],
    monthlyTds: row.monthlyTds as SalaryStructureRecord["monthlyTds"],
    monthlyPt: row.monthlyPt as SalaryStructureRecord["monthlyPt"],
    expectedMonthlyNet: row.expectedMonthlyNet as SalaryStructureRecord["expectedMonthlyNet"],
    componentsJson: row.componentsJson,
    notes: row.notes,
  };
}

/**
 * Creates draft payroll lines for every employee eligible in the run's salary month.
 * Payment matching enriches lines; it is never a prerequisite for appearing in payroll.
 * Idempotent: unique (payrollRunId, employeeId); preserves reviewed/issued lines.
 */
export async function populatePayrollEmployeeLines(input: {
  actorUserId?: string;
  payrollRunId: string;
  matchPayments?: boolean;
  daysBefore?: number;
  daysAfter?: number;
}): Promise<PopulatePayrollResult> {
  const run = await prisma.payrollRun.findUniqueOrThrow({
    where: { id: input.payrollRunId },
    include: { company: { select: { id: true, matchScoreThreshold: true, autoIssueExactMatches: true } } },
  });

  const period = payrollPeriodBounds(run.year, run.month);
  const runEditable = EDITABLE_RUN_STATUSES.has(run.status);

  const empty = (partial: Partial<PopulateDiagnostics> & Pick<PopulateDiagnostics, "reason" | "nextAction">): PopulatePayrollResult => ({
    payrollRunId: run.id,
    companyId: run.companyId,
    year: run.year,
    month: run.month,
    diagnostics: {
      employeesFound: 0,
      eligibleEmployees: 0,
      excludedJoinedAfter: 0,
      excludedExitedBefore: 0,
      linesCreated: 0,
      linesPreserved: 0,
      linesRefreshed: 0,
      salaryReviewRequired: 0,
      paymentsMatched: 0,
      paymentsUnmatched: 0,
      contactDetailsMissing: 0,
      ...partial,
    },
  });

  if (!runEditable) {
    return empty({
      reason: "run_not_editable",
      nextAction:
        "Issued or cancelled runs cannot be re-populated. Create a correction payslip if needed.",
    });
  }

  const employees = await prisma.employee.findMany({
    where: { companyId: run.companyId },
    include: {
      contact: true,
      bankAccount: true,
      salaryStructure: true,
      salaryStructureVersions: { orderBy: { version: "asc" } },
      paymentAliases: true,
      priorMappings: true,
    },
    orderBy: { employeeCode: "asc" },
  });

  let excludedJoinedAfter = 0;
  let excludedExitedBefore = 0;
  const eligible = employees.filter((employee) => {
    const result = evaluateEmploymentEligibility(employee, period);
    if (result.eligible) return true;
    if (result.reason === "joined_after_period") excludedJoinedAfter += 1;
    if (result.reason === "exited_before_period") excludedExitedBefore += 1;
    return false;
  });

  const existingLines = await prisma.payrollEmployeeLine.findMany({
    where: { payrollRunId: run.id },
    include: { payslip: { select: { id: true, status: true } } },
  });
  const lineByEmployee = new Map(existingLines.map((line) => [line.employeeId, line]));

  let linesCreated = 0;
  let linesPreserved = 0;
  let linesRefreshed = 0;
  let salaryReviewRequired = 0;
  let contactDetailsMissing = 0;

  for (const employee of eligible) {
    const existing = lineByEmployee.get(employee.id);
    if (existing?.payslip && (existing.payslip.status === "ISSUED" || existing.payslip.status === "ISSUING")) {
      linesPreserved += 1;
      continue;
    }
    if (
      existing &&
      (PRESERVE_LINE_STATUSES.has(existing.status) ||
        PRESERVE_PAYMENT_STATUSES.has(existing.paymentStatus))
    ) {
      linesPreserved += 1;
      continue;
    }

    const contact = employee.contact;
    if (!contact?.primaryPhone && !contact?.personalEmail && !contact?.officialEmail) {
      contactDetailsMissing += 1;
    }

    const effective = selectEffectiveSalaryStructure({
      period,
      current: employee.salaryStructure
        ? {
            version: employee.salaryStructure.version,
            effectiveFrom: employee.salaryStructure.effectiveFrom,
            annualCtc: employee.salaryStructure.annualCtc,
            monthlyGross: employee.salaryStructure.monthlyGross,
            monthlyTds: employee.salaryStructure.monthlyTds,
            monthlyPt: employee.salaryStructure.monthlyPt,
            expectedMonthlyNet: employee.salaryStructure.expectedMonthlyNet,
            componentsJson: employee.salaryStructure.componentsJson,
            notes: employee.salaryStructure.notes,
          }
        : null,
      versions: employee.salaryStructureVersions,
    });

    let earnings: Array<{ code: string; label: string; actual: number; payable: number }> = [];
    let deductions: Array<{ code: string; label: string; amount: number }> = [];
    let grossEarnings = 0;
    let grossDeductions = 0;
    let netAmount = 0;
    let expectedAmount: number | null = null;
    let paymentStatus: ReconciliationStatus = "UNMATCHED";
    let snapshot: ReturnType<typeof toSalarySnapshot> | null = null;
    let approvalReason: string | null = null;

    if (effective.status === "found") {
      const structure = asStructureRecord(effective.structure);
      const derived = structureToEarningsDeductions(structure);
      earnings = derived.earnings;
      deductions = derived.deductions;
      grossEarnings = derived.grossEarnings;
      grossDeductions = derived.grossDeductions;
      // Prefer expected monthly net from structure for payroll preparation.
      expectedAmount = resolveExpectedMonthlyNet(structure);
      netAmount = expectedAmount ?? derived.netAmount;
      snapshot = toSalarySnapshot(structure);
      if (!isSalaryStructureComplete(structure)) {
        paymentStatus = "SALARY_STRUCTURE_INCOMPLETE";
        salaryReviewRequired += 1;
        approvalReason = "Historical salary review required";
        snapshot = {
          ...snapshot,
          notes: "Historical salary review required — structure incomplete for this month",
        };
      }
    } else {
      paymentStatus = "SALARY_STRUCTURE_INCOMPLETE";
      salaryReviewRequired += 1;
      approvalReason = "Historical salary review required";
      snapshot = {
        version: 0,
        effectiveFrom: null,
        annualCtc: null,
        monthlyGross: null,
        monthlyTds: null,
        monthlyPt: null,
        expectedMonthlyNet: null,
        components: {},
        earnings: [],
        deductions: [],
        grossEarnings: 0,
        grossDeductions: 0,
        netAmount: 0,
        complete: false,
        missing: ["historicalSalaryStructure"],
        notes: "Historical salary review required — no structure covering this payroll month",
      };
    }

    const { money, moneySum, roundInr } = await import("@/server/finance/money");
    if (earnings.length || deductions.length) {
      grossEarnings = roundInr(moneySum(earnings.map((e) => e.payable)));
      grossDeductions = roundInr(moneySum(deductions.map((d) => d.amount)));
      if (expectedAmount == null) {
        netAmount = roundInr(money(grossEarnings).minus(grossDeductions));
      }
    }

    if (!existing) {
      const created = await prisma.$transaction(async (tx) => {
        const line = await tx.payrollEmployeeLine.create({
          data: {
            payrollRunId: run.id,
            employeeId: employee.id,
            status: "DRAFT",
            paymentStatus,
            expectedAmount,
            actualAmount: null,
            varianceAmount: null,
            approvalReason,
            calculationSnapshotJson: snapshot,
            grossEarnings,
            grossDeductions,
            netAmount,
            amountInWords: amountInWordsInr(netAmount),
            earnings: {
              create: earnings.map((e) => ({
                code: e.code,
                label: e.label,
                actual: e.actual,
                payable: e.payable,
              })),
            },
            deductions: {
              create: deductions.map((d) => ({
                code: d.code,
                label: d.label,
                amount: d.amount,
              })),
            },
          },
        });
        return line;
      });
      lineByEmployee.set(employee.id, created as (typeof existingLines)[number]);
      linesCreated += 1;
    } else {
      // Refresh draft amounts / structure flags without touching payment links.
      await prisma.$transaction(async (tx) => {
        await tx.payrollEarningLine.deleteMany({ where: { lineId: existing.id } });
        await tx.payrollDeductionLine.deleteMany({ where: { lineId: existing.id } });
        if (earnings.length) {
          await tx.payrollEarningLine.createMany({
            data: earnings.map((e) => ({
              lineId: existing.id,
              code: e.code,
              label: e.label,
              actual: e.actual,
              payable: e.payable,
            })),
          });
        }
        if (deductions.length) {
          await tx.payrollDeductionLine.createMany({
            data: deductions.map((d) => ({
              lineId: existing.id,
              code: d.code,
              label: d.label,
              amount: d.amount,
            })),
          });
        }
        await tx.payrollEmployeeLine.update({
          where: { id: existing.id },
          data: {
            status: "DRAFT",
            // Keep an existing payment link; only reset payment status when unmatched.
            paymentStatus: existing.primaryTxnId ? existing.paymentStatus : paymentStatus,
            expectedAmount,
            approvalReason: existing.approvalReason ?? approvalReason,
            calculationSnapshotJson: snapshot,
            grossEarnings,
            grossDeductions,
            netAmount,
            amountInWords: amountInWordsInr(netAmount),
          },
        });
      });
      linesRefreshed += 1;
    }
  }

  let paymentsMatched = 0;
  let paymentsUnmatched = 0;

  if (input.matchPayments !== false) {
    const matchResult = await enrichLinesWithPaymentMatches({
      payrollRunId: run.id,
      companyId: run.companyId,
      period,
      matchScoreThreshold: run.company.matchScoreThreshold,
      daysBefore: input.daysBefore,
      daysAfter: input.daysAfter,
    });
    paymentsMatched = matchResult.matched;
    paymentsUnmatched = matchResult.unmatched;
  } else {
    paymentsUnmatched = eligible.length;
  }

  const counts = {
    employeesFound: employees.length,
    eligibleEmployees: eligible.length,
    excludedJoinedAfter,
    excludedExitedBefore,
    linesCreated,
    linesPreserved,
    linesRefreshed,
    salaryReviewRequired,
    paymentsMatched,
    paymentsUnmatched,
    contactDetailsMissing,
    runEditable: true,
  };
  const { reason, nextAction } = summarizePopulateReason(counts);

  if (run.status === "DRAFT" && linesCreated + linesRefreshed + linesPreserved > 0) {
    await prisma.payrollRun.update({
      where: { id: run.id },
      data: {
        status: salaryReviewRequired > 0 || paymentsUnmatched > 0
          ? "RECONCILIATION_REQUIRED"
          : "READY_FOR_REVIEW",
      },
    });
  }

  await writeAudit({
    actorUserId: input.actorUserId,
    companyId: run.companyId,
    action: "payroll.populate_lines",
    entityType: "PayrollRun",
    entityId: run.id,
    metadata: { ...counts, reason, nextAction },
  });

  return {
    payrollRunId: run.id,
    companyId: run.companyId,
    year: run.year,
    month: run.month,
    diagnostics: { ...counts, reason, nextAction },
  };
}

async function enrichLinesWithPaymentMatches(input: {
  payrollRunId: string;
  companyId: string;
  period: ReturnType<typeof payrollPeriodBounds>;
  matchScoreThreshold: number;
  daysBefore?: number;
  daysAfter?: number;
}): Promise<{ matched: number; unmatched: number }> {
  const window = paymentSearchWindow(input.period, {
    daysBefore: input.daysBefore,
    daysAfter: input.daysAfter,
  });

  const lines = await prisma.payrollEmployeeLine.findMany({
    where: {
      payrollRunId: input.payrollRunId,
      status: { in: ["DRAFT"] },
      OR: [{ primaryTxnId: null }, { paymentStatus: "UNMATCHED" }],
    },
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
  });

  // Company-scoped debits in the search window that are not already allocated to any line.
  const usedTxnIds = new Set(
    (
      await prisma.payrollEmployeeLine.findMany({
        where: { primaryTxnId: { not: null }, payrollRun: { companyId: input.companyId } },
        select: { primaryTxnId: true },
      })
    )
      .map((row) => row.primaryTxnId)
      .filter((id): id is string => !!id),
  );

  const transactions = await prisma.statementTransaction.findMany({
    where: {
      statement: { companyId: input.companyId },
      debit: { gt: 0 },
      isDuplicate: false,
      OR: [
        { valueDate: { gte: window.searchStart, lte: window.searchEnd } },
        { txnDate: { gte: window.searchStart, lte: window.searchEnd } },
      ],
    },
    orderBy: [{ valueDate: "asc" }, { txnDate: "asc" }],
  });

  const available = transactions.filter((txn) => !usedTxnIds.has(txn.id));
  let matched = 0;
  let unmatched = 0;

  for (const line of lines) {
    if (line.primaryTxnId && PRESERVE_PAYMENT_STATUSES.has(line.paymentStatus)) {
      matched += 1;
      continue;
    }

    const employee = line.employee;
    const expectedNet =
      toAmount(line.expectedAmount) ?? resolveExpectedMonthlyNet(employee.salaryStructure);

    const candidate: MatchCandidateInput = {
      employeeId: employee.id,
      employeeName:
        employee.displayName?.trim() || `${employee.firstName} ${employee.lastName}`,
      accountHolderName: employee.bankAccount?.accountHolderName,
      paymentAliases: employee.paymentAliases.map((alias) => alias.alias),
      accountLast4: employee.bankAccount?.accountLast4,
      expectedNetPay: expectedNet,
      hasPriorApprovedMapping: false,
    };

    type Scored = { txnId: string; score: number; amount: number; particulars: string; utr?: string | null; cheque?: string | null };
    const scored: Scored[] = [];

    for (const txn of available) {
      if (usedTxnIds.has(txn.id)) continue;
      const beneficiary = normalizeName(extractBeneficiaryFromParticulars(txn.particulars));
      const hasPrior = employee.priorMappings.some(
        (mapping) => normalizeName(mapping.normalizedName) === beneficiary,
      );
      const ranked = rankMatchSuggestions(
        { particulars: txn.particulars, amount: Number(txn.debit) },
        [{ ...candidate, hasPriorApprovedMapping: hasPrior }],
        input.matchScoreThreshold,
      );
      const top = ranked[0];
      if (!top || top.score <= 0) continue;
      scored.push({
        txnId: txn.id,
        score: top.score,
        amount: Number(txn.debit),
        particulars: txn.particulars,
        utr: txn.utrReference,
        cheque: txn.chequeNumber,
      });
    }

    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];
    const runnerUp = scored[1];
    const confident =
      !!best &&
      best.score >= input.matchScoreThreshold &&
      (!runnerUp || best.score - runnerUp.score > COLLISION_MARGIN);

    if (!confident || !best) {
      unmatched += 1;
      continue;
    }

    // Ambiguous: another open line could claim the same debit — skip auto-link.
    const competing = lines.filter((other) => other.id !== line.id && !other.primaryTxnId);
    let contested = false;
    for (const other of competing) {
      const otherEmp = other.employee;
      const otherCandidate: MatchCandidateInput = {
        employeeId: otherEmp.id,
        employeeName:
          otherEmp.displayName?.trim() || `${otherEmp.firstName} ${otherEmp.lastName}`,
        accountHolderName: otherEmp.bankAccount?.accountHolderName,
        paymentAliases: otherEmp.paymentAliases.map((a) => a.alias),
        accountLast4: otherEmp.bankAccount?.accountLast4,
        expectedNetPay: toAmount(other.expectedAmount),
      };
      const ranked = rankMatchSuggestions(
        { particulars: best.particulars, amount: best.amount },
        [otherCandidate],
        input.matchScoreThreshold,
      );
      if (ranked[0] && ranked[0].score >= input.matchScoreThreshold) {
        contested = true;
        break;
      }
    }
    if (contested) {
      unmatched += 1;
      continue;
    }

    const structureComplete = isSalaryStructureComplete(employee.salaryStructure) &&
      line.paymentStatus !== "SALARY_STRUCTURE_INCOMPLETE";
    const decision = decidePaymentAutomation({
      matchConfident: true,
      salaryStructureComplete: structureComplete && expectedNet != null,
      expectedMonthlyNet: expectedNet,
      actualAmount: best.amount,
      autoIssueExactMatches: false,
    });

    try {
      await prisma.payrollEmployeeLine.update({
        where: { id: line.id },
        data: {
          primaryTxnId: best.txnId,
          paymentStatus: decision.status as ReconciliationStatus,
          actualAmount: decision.actualAmount,
          varianceAmount: decision.varianceAmount,
          expectedAmount: decision.expectedAmount ?? line.expectedAmount,
          paymentReference: best.utr ?? extractUtrReference(best.particulars) ?? best.cheque,
        },
      });
      usedTxnIds.add(best.txnId);
      available.splice(
        available.findIndex((txn) => txn.id === best.txnId),
        1,
      );
      matched += 1;
    } catch {
      // Unique primaryTxnId collision — leave unmatched for review.
      unmatched += 1;
    }
  }

  return { matched, unmatched };
}

export type PaymentDecisionStatus =
  | "MATCHED_EXACT"
  | "PARTIAL_PAYMENT_REVIEW_REQUIRED"
  | "AMOUNT_MISMATCH_REVIEW_REQUIRED"
  | "UNMATCHED"
  | "SALARY_STRUCTURE_INCOMPLETE";

export type PaymentDecision = {
  status: PaymentDecisionStatus;
  expectedAmount: number | null;
  actualAmount: number;
  varianceAmount: number | null;
  canAutoCreatePayrollLine: boolean;
  canAutoIssue: boolean;
  suggestedAction: string;
};

const AMOUNT_EPSILON = 0.01;

export function compareNetAmounts(actual: number, expected: number): "exact" | "lower" | "higher" {
  const variance = Math.round((actual - expected) * 100) / 100;
  if (Math.abs(variance) <= AMOUNT_EPSILON) return "exact";
  return variance < 0 ? "lower" : "higher";
}

export function decidePaymentAutomation(input: {
  matchConfident: boolean;
  salaryStructureComplete: boolean;
  expectedMonthlyNet: number | null;
  actualAmount: number;
  autoIssueExactMatches: boolean;
}): PaymentDecision {
  const actualAmount = Math.round(input.actualAmount * 100) / 100;

  if (!input.matchConfident) {
    return {
      status: "UNMATCHED",
      expectedAmount: input.expectedMonthlyNet,
      actualAmount,
      varianceAmount:
        input.expectedMonthlyNet != null
          ? Math.round((actualAmount - input.expectedMonthlyNet) * 100) / 100
          : null,
      canAutoCreatePayrollLine: false,
      canAutoIssue: false,
      suggestedAction: "Map manually, mark non-payroll, or ignore with audit reason",
    };
  }

  if (!input.salaryStructureComplete || input.expectedMonthlyNet == null || input.expectedMonthlyNet <= 0) {
    return {
      status: "SALARY_STRUCTURE_INCOMPLETE",
      expectedAmount: input.expectedMonthlyNet,
      actualAmount,
      varianceAmount: null,
      canAutoCreatePayrollLine: false,
      canAutoIssue: false,
      suggestedAction: "Complete employee salary structure before generating payslip",
    };
  }

  const expectedAmount = Math.round(input.expectedMonthlyNet * 100) / 100;
  const varianceAmount = Math.round((actualAmount - expectedAmount) * 100) / 100;
  const comparison = compareNetAmounts(actualAmount, expectedAmount);

  if (comparison === "exact") {
    return {
      status: "MATCHED_EXACT",
      expectedAmount,
      actualAmount,
      varianceAmount: 0,
      canAutoCreatePayrollLine: true,
      canAutoIssue: input.autoIssueExactMatches,
      suggestedAction: input.autoIssueExactMatches
        ? "Auto-create payroll line and issue payslip"
        : "Auto-create payroll line; issue after company setting or approval",
    };
  }

  if (comparison === "lower") {
    return {
      status: "PARTIAL_PAYMENT_REVIEW_REQUIRED",
      expectedAmount,
      actualAmount,
      varianceAmount,
      canAutoCreatePayrollLine: true,
      canAutoIssue: false,
      suggestedAction: "Review partial payment; approve adjustment before issue/email",
    };
  }

  return {
    status: "AMOUNT_MISMATCH_REVIEW_REQUIRED",
    expectedAmount,
    actualAmount,
    varianceAmount,
    canAutoCreatePayrollLine: true,
    canAutoIssue: false,
    suggestedAction: "Classify excess amount (OT/bonus/etc.) and approve before issue",
  };
}

export function canIssueAllSelected(statuses: PaymentDecisionStatus[]): boolean {
  return statuses.every((status) => status === "MATCHED_EXACT" || status === "APPROVED_FOR_ISSUE" as PaymentDecisionStatus);
}

/**
 * Reconciliation states a payroll line may be issued from. Everything else is either an
 * unreviewed variance or an explicitly excluded transaction.
 */
export const ISSUABLE_RECONCILIATION_STATUSES = [
  "MATCHED_EXACT",
  "APPROVED_FOR_ISSUE",
  "ISSUED",
  "EMAIL_SENT",
  "EMAIL_FAILED",
] as const;

/** Variances and gaps that a human must resolve before any payslip is issued. */
export const UNRESOLVED_RECONCILIATION_STATUSES = [
  "UNMATCHED",
  "PARTIAL_PAYMENT_REVIEW_REQUIRED",
  "AMOUNT_MISMATCH_REVIEW_REQUIRED",
  "SALARY_STRUCTURE_INCOMPLETE",
] as const;

export function isIssuablePaymentStatus(status: string): boolean {
  return (ISSUABLE_RECONCILIATION_STATUSES as readonly string[]).includes(status);
}

export function isUnresolvedPaymentStatus(status: string): boolean {
  return (UNRESOLVED_RECONCILIATION_STATUSES as readonly string[]).includes(status);
}

export function partitionIssuableLines<T extends { id: string; paymentStatus: string }>(
  lines: T[],
): { issuable: T[]; blocked: T[] } {
  const issuable: T[] = [];
  const blocked: T[] = [];
  for (const line of lines) {
    if (isIssuablePaymentStatus(line.paymentStatus)) issuable.push(line);
    else blocked.push(line);
  }
  return { issuable, blocked };
}

export function buildMatchExplanation(input: {
  score: number;
  breakdown: {
    nameSimilarity: number;
    accountLast4: number;
    expectedNetPay: number;
    priorApprovedMapping: number;
    paymentAlias?: number;
  };
  beneficiary: string;
  employeeName: string;
}): string {
  const parts = [
    `Score ${input.score}/100`,
    `beneficiary "${input.beneficiary}" vs "${input.employeeName}" (name ${input.breakdown.nameSimilarity})`,
  ];
  if (input.breakdown.accountLast4) parts.push(`account last-4 +${input.breakdown.accountLast4}`);
  if (input.breakdown.expectedNetPay) parts.push(`net-pay proximity +${input.breakdown.expectedNetPay}`);
  if (input.breakdown.priorApprovedMapping) parts.push(`prior mapping +${input.breakdown.priorApprovedMapping}`);
  if (input.breakdown.paymentAlias) parts.push(`payment alias +${input.breakdown.paymentAlias}`);
  return parts.join("; ");
}

export function extractUtrReference(particulars: string): string | undefined {
  const patterns = [
    /\bUTR[:\s-]*([A-Z0-9]{8,30})\b/i,
    /\b(?:IMPS|NEFT|RTGS)[\/\s-]*([A-Z0-9]{10,30})\b/i,
    /\bREF[:\s-]*([A-Z0-9]{8,30})\b/i,
  ];
  for (const pattern of patterns) {
    const match = particulars.match(pattern);
    if (match?.[1]) return match[1].toUpperCase();
  }
  return undefined;
}

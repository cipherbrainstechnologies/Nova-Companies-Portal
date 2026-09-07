import { StatusBadge } from "@/components/industrial";

type Tone = "neutral" | "success" | "warning" | "danger" | "info";

export const RECONCILIATION_STATUS_META: Record<string, { label: string; tone: Tone }> = {
  UNMATCHED: { label: "Unmatched", tone: "neutral" },
  MATCHED_EXACT: { label: "Exact Match", tone: "success" },
  PARTIAL_PAYMENT_REVIEW_REQUIRED: { label: "Partial Payment", tone: "warning" },
  AMOUNT_MISMATCH_REVIEW_REQUIRED: { label: "Amount Mismatch", tone: "warning" },
  SALARY_STRUCTURE_INCOMPLETE: { label: "Salary Structure Incomplete", tone: "danger" },
  MANUALLY_MAPPED: { label: "Manually Mapped", tone: "info" },
  NON_PAYROLL: { label: "Non-Payroll", tone: "neutral" },
  IGNORED: { label: "Ignored", tone: "neutral" },
  APPROVED_FOR_ISSUE: { label: "Approved for Issue", tone: "success" },
  ISSUED: { label: "Issued", tone: "success" },
  EMAIL_SENT: { label: "Email Sent", tone: "success" },
  EMAIL_FAILED: { label: "Email Failed", tone: "danger" },
};

export function reconciliationStatusLabel(status: string): string {
  return RECONCILIATION_STATUS_META[status]?.label ?? status;
}

export function ReconciliationStatusBadge({ status }: { status: string }) {
  const meta = RECONCILIATION_STATUS_META[status] ?? { label: status, tone: "neutral" as Tone };
  return <StatusBadge status={meta.label} tone={meta.tone} />;
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Select } from "@/components/ui";
import { AlertBanner } from "@/components/industrial";
import { t } from "@/i18n";

type ReviewAction = "approve" | "reject" | "map" | "ignore" | "non_payroll";

const VARIANCE_OPTIONS = [
  "OVERTIME",
  "BONUS",
  "REIMBURSEMENT",
  "ADJUSTMENT",
  "ARREARS",
  "DUPLICATE_PAYMENT",
  "UNPAID_LEAVE",
  "LOAN_DEDUCTION",
  "CASH_COMPONENT",
  "OTHER",
] as const;

export type ReviewEmployeeOption = { id: string; label: string };

export function ReconciliationReviewControls({
  transactionId,
  companyId,
  employees,
  matchedEmployeeId,
  requiresVarianceReason,
  disabled,
}: {
  transactionId: string;
  companyId: string;
  employees: ReviewEmployeeOption[];
  matchedEmployeeId?: string | null;
  requiresVarianceReason?: boolean;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState(matchedEmployeeId ?? "");
  const [varianceClassification, setVarianceClassification] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<ReviewAction | null>(null);
  const [error, setError] = useState("");

  async function review(action: ReviewAction) {
    setError("");
    setBusy(action);
    try {
      const res = await fetch(`/api/statements/transactions/${transactionId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          companyId,
          employeeId: employeeId || undefined,
          varianceClassification: varianceClassification || undefined,
          reason: reason.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("en", "common.failed"));
      setReason("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("en", "common.failed"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-3 space-y-3 border-t border-[var(--nova-border)] pt-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <Select
          aria-label="Map to employee"
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          disabled={disabled}
        >
          <option value="">Select employee…</option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.label}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Variance classification"
          value={varianceClassification}
          onChange={(e) => setVarianceClassification(e.target.value)}
          disabled={disabled}
        >
          <option value="">Variance type…</option>
          {VARIANCE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option.replace(/_/g, " ").toLowerCase()}
            </option>
          ))}
        </Select>
        <Input
          aria-label="Review reason"
          placeholder={requiresVarianceReason ? "Reason (required)" : "Reason"}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={disabled}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={disabled || !!busy} onClick={() => void review("approve")}>
          {busy === "approve" ? "Approving…" : "Approve for issue"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled || !!busy || !employeeId}
          onClick={() => void review("map")}
        >
          {busy === "map" ? "Mapping…" : "Map to employee"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={disabled || !!busy}
          onClick={() => void review("reject")}
        >
          Reject match
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={disabled || !!busy}
          onClick={() => void review("non_payroll")}
        >
          Not payroll
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={disabled || !!busy}
          onClick={() => void review("ignore")}
        >
          Ignore
        </Button>
      </div>
      {requiresVarianceReason ? (
        <p className="text-xs text-[var(--nova-warning)]">
          This payment differs from the expected net. Classify the variance and give a reason —
          approval is the only way it can ever reach payslip issue.
        </p>
      ) : null}
      {error ? <AlertBanner tone="danger">{error}</AlertBanner> : null}
    </div>
  );
}

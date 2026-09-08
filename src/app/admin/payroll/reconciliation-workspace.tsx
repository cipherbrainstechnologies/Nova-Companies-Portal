"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, Input, Select, Label } from "@/components/ui";
import { AlertBanner, Meta, MoneyValue } from "@/components/industrial";
import { Modal } from "@/components/modal";
import { ReconciliationStatusBadge } from "@/components/reconciliation-status";
import type {
  PayrollReconciliationItem,
  ReconciliationFilter,
} from "@/server/payroll/unresolved-payments";

type EmployeeOption = { id: string; label: string };
type AllocatableTxn = {
  id: string;
  txnDate: string;
  particulars: string;
  debit: number | null;
  utrReference: string | null;
  reconciliationStatus: string;
};

type ReviewAction = "approve" | "reject" | "map" | "ignore" | "non_payroll";

const FILTERS: Array<{ id: ReconciliationFilter; label: string }> = [
  { id: "unresolved", label: "Unresolved" },
  { id: "unmatched", label: "Unmatched employee" },
  { id: "below_expected", label: "Below expected net" },
  { id: "above_expected", label: "Above expected net" },
  { id: "missing_structure", label: "Missing salary structure" },
  { id: "ambiguous", label: "Ambiguous match" },
  { id: "resolved", label: "Resolved" },
  { id: "all", label: "All" },
];

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

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN");
}

export function PayrollReconciliationWorkspace({
  companyId,
  runId,
  year,
  month,
  companyName,
  items,
  unresolvedCount,
  filterCounts,
  activeFilter,
  employees,
  allocatableTransactions,
  canEdit,
  canApprove,
  approvalBlockedReason,
}: {
  companyId: string;
  runId: string;
  year: number;
  month: number;
  companyName: string;
  items: PayrollReconciliationItem[];
  unresolvedCount: number;
  filterCounts: Record<ReconciliationFilter, number>;
  activeFilter: ReconciliationFilter;
  employees: EmployeeOption[];
  allocatableTransactions: AllocatableTxn[];
  canEdit: boolean;
  canApprove: boolean;
  approvalBlockedReason?: string;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(
    () => items.find((item) => item.lineId === selectedId) ?? null,
    [items, selectedId],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--nova-ink)]">
            Reconciliation · {companyName}
          </h2>
          <Meta className="mt-1">
            Salary month {String(month).padStart(2, "0")}/{year} · {unresolvedCount} unresolved
          </Meta>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/payroll?companyId=${companyId}`}
            className="inline-flex min-h-11 items-center rounded-[var(--nova-radius-sm)] px-3 text-sm font-semibold text-[var(--nova-teal)] hover:underline"
          >
            ← Back to Payroll
          </Link>
        </div>
      </div>

      {!canEdit ? (
        <AlertBanner tone="warning">
          You can inspect payments, but reconciliation edits require the statements reconcile
          permission
          {approvalBlockedReason ? `. ${approvalBlockedReason}` : "."}
        </AlertBanner>
      ) : !canApprove && approvalBlockedReason ? (
        <AlertBanner tone="info">{approvalBlockedReason}</AlertBanner>
      ) : null}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((filter) => {
          const count = filterCounts[filter.id] ?? 0;
          const active = activeFilter === filter.id;
          return (
            <Link
              key={filter.id}
              href={`/admin/payroll/reconciliation?companyId=${companyId}&runId=${runId}&filter=${filter.id}`}
              className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold ${
                active
                  ? "border-[var(--nova-teal)] bg-[var(--nova-teal)] text-white"
                  : "border-[var(--nova-border)] bg-[var(--nova-surface)] text-[var(--nova-text-secondary)]"
              }`}
            >
              {filter.label} ({count})
            </Link>
          );
        })}
      </div>

      <div className="grid gap-3">
        {items.map((item) => {
          const reason =
            item.approvalReason ||
            item.transaction?.reviewReason ||
            item.transaction?.matchExplanation ||
            (item.paymentStatus === "SALARY_STRUCTURE_INCOMPLETE"
              ? "Historical salary review required"
              : item.paymentStatus === "UNMATCHED"
                ? "No confident bank match"
                : "Payment differs from expected net");
          return (
            <Card key={item.lineId} className="p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <ReconciliationStatusBadge status={item.paymentStatus} />
                    <Meta>
                      {item.transaction
                        ? formatDate(item.transaction.txnDate)
                        : `${String(item.month).padStart(2, "0")}/${item.year}`}
                    </Meta>
                    {item.paymentReference ? <Meta>Ref {item.paymentReference}</Meta> : null}
                    {item.contactIncomplete ? <Meta>Contact details pending</Meta> : null}
                  </div>
                  <div className="font-semibold text-[var(--nova-ink)]">
                    {item.employeeCode} · {item.employeeName}
                  </div>
                  <p className="text-sm text-[var(--nova-text-secondary)]">
                    {item.transaction?.particulars ??
                      "No bank payment linked yet — choose a debit in Review."}
                  </p>
                  <dl className="grid gap-2 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="text-xs uppercase text-[var(--nova-muted)]">Expected net</dt>
                      <dd>
                        {item.expectedAmount != null ? (
                          <MoneyValue value={item.expectedAmount} />
                        ) : (
                          "—"
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase text-[var(--nova-muted)]">Actual</dt>
                      <dd>
                        {item.actualAmount != null ? (
                          <MoneyValue value={item.actualAmount} />
                        ) : (
                          "—"
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase text-[var(--nova-muted)]">Difference</dt>
                      <dd
                        className={
                          item.varianceAmount != null && Math.abs(item.varianceAmount) > 0.01
                            ? "text-[var(--nova-warning)]"
                            : undefined
                        }
                      >
                        {item.expectedAmount == null ? (
                          "—"
                        ) : item.varianceAmount != null ? (
                          <MoneyValue value={item.varianceAmount} />
                        ) : (
                          "—"
                        )}
                      </dd>
                    </div>
                  </dl>
                  <p className="text-xs text-[var(--nova-muted)]">Reason: {reason}</p>
                  {item.transaction?.suggestions?.length ? (
                    <p className="text-xs text-[var(--nova-muted)]">
                      Suggested:{" "}
                      {item.transaction.suggestions
                        .slice(0, 3)
                        .map((s) => `${s.employeeCode} (${s.score})`)
                        .join(", ")}
                    </p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full shrink-0 sm:w-auto"
                  onClick={() => setSelectedId(item.lineId)}
                >
                  Review
                </Button>
              </div>
            </Card>
          );
        })}
        {!items.length ? (
          <AlertBanner tone="info">
            No payments match this filter. Switch filters or return to payroll.
          </AlertBanner>
        ) : null}
      </div>

      {selected ? (
        <ReviewDrawer
          item={selected}
          employees={employees}
          allocatableTransactions={allocatableTransactions}
          canEdit={canEdit}
          canApprove={canApprove}
          approvalBlockedReason={approvalBlockedReason}
          onClose={() => setSelectedId(null)}
          onSaved={() => {
            setSelectedId(null);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function ReviewDrawer({
  item,
  employees,
  allocatableTransactions,
  canEdit,
  canApprove,
  approvalBlockedReason,
  onClose,
  onSaved,
}: {
  item: PayrollReconciliationItem;
  employees: EmployeeOption[];
  allocatableTransactions: AllocatableTxn[];
  canEdit: boolean;
  canApprove: boolean;
  approvalBlockedReason?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [employeeId, setEmployeeId] = useState(item.employeeId);
  const [transactionId, setTransactionId] = useState(item.primaryTxnId ?? "");
  const [salaryYear, setSalaryYear] = useState(String(item.year));
  const [salaryMonth, setSalaryMonth] = useState(String(item.month));
  const [varianceClassification, setVarianceClassification] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<ReviewAction | null>(null);
  const [error, setError] = useState("");

  const selectedTxn =
    allocatableTransactions.find((txn) => txn.id === transactionId) ??
    (item.transaction
      ? {
          id: item.transaction.id,
          txnDate: item.transaction.txnDate,
          particulars: item.transaction.particulars,
          debit: item.transaction.debit,
          utrReference: item.transaction.utrReference,
          reconciliationStatus: item.transaction.reconciliationStatus,
        }
      : null);

  const expected = item.expectedAmount;
  const actual = selectedTxn?.debit ?? item.actualAmount;
  const remaining =
    expected != null && actual != null ? Math.round((expected - actual) * 100) / 100 : null;

  async function review(action: ReviewAction) {
    setError("");
    if (!canEdit) {
      setError("You do not have permission to edit reconciliation.");
      return;
    }
    if (action === "approve" && !canApprove) {
      setError(approvalBlockedReason ?? "Approval is not available for your role.");
      return;
    }
    const txnId = transactionId || item.primaryTxnId;
    if (!txnId && action !== "ignore") {
      setError("Select a bank payment to allocate before mapping or approving.");
      return;
    }
    if (!txnId) {
      setError("No payment linked — ignore requires a bank transaction context.");
      return;
    }
    setBusy(action);
    try {
      const res = await fetch(`/api/statements/transactions/${txnId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          companyId: item.companyId,
          employeeId: employeeId || undefined,
          varianceClassification: varianceClassification || undefined,
          reason: reason.trim() || undefined,
          salaryYear: Number(salaryYear),
          salaryMonth: Number(salaryMonth),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Review failed");
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Review failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={`Review · ${item.employeeCode}`}
      description={`${item.employeeName} · ${item.companyName} · ${String(item.month).padStart(2, "0")}/${item.year}`}
    >
      <div className="space-y-4">
        <div className="rounded-[var(--nova-radius-sm)] bg-[var(--nova-surface-muted)] p-3 text-sm">
          <div className="font-semibold">Source payment</div>
          {selectedTxn ? (
            <>
              <p className="mt-1 text-[var(--nova-text-secondary)]">{selectedTxn.particulars}</p>
              <Meta className="mt-2">
                {formatDate(selectedTxn.txnDate)}
                {selectedTxn.utrReference ? ` · UTR ${selectedTxn.utrReference}` : ""}
                {selectedTxn.debit != null ? ` · ₹${selectedTxn.debit.toLocaleString("en-IN")}` : ""}
              </Meta>
            </>
          ) : (
            <p className="mt-1 text-[var(--nova-muted)]">No payment linked yet.</p>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Employee (company-scoped)</Label>
            <Select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              disabled={!canEdit}
            >
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Bank payment to allocate</Label>
            <Select
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              disabled={!canEdit}
            >
              <option value="">Select payment…</option>
              {item.primaryTxnId && item.transaction ? (
                <option value={item.primaryTxnId}>
                  Current · ₹{item.transaction.debit?.toLocaleString("en-IN") ?? "—"} ·{" "}
                  {item.transaction.particulars.slice(0, 48)}
                </option>
              ) : null}
              {allocatableTransactions.map((txn) => (
                <option key={txn.id} value={txn.id}>
                  {formatDate(txn.txnDate)} · ₹{txn.debit?.toLocaleString("en-IN") ?? "—"} ·{" "}
                  {txn.particulars.slice(0, 48)}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Salary year</Label>
            <Input
              type="number"
              value={salaryYear}
              onChange={(e) => setSalaryYear(e.target.value)}
              disabled={!canEdit}
            />
          </div>
          <div>
            <Label>Salary month</Label>
            <Select
              value={salaryMonth}
              onChange={(e) => setSalaryMonth(e.target.value)}
              disabled={!canEdit}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={String(m)}>
                  {String(m).padStart(2, "0")}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Difference classification</Label>
            <Select
              value={varianceClassification}
              onChange={(e) => setVarianceClassification(e.target.value)}
              disabled={!canEdit}
            >
              <option value="">Select…</option>
              {VARIANCE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option.replace(/_/g, " ").toLowerCase()}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Explanation</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Required for variances / ignore / reject"
              disabled={!canEdit}
            />
          </div>
        </div>

        <dl className="grid gap-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs uppercase text-[var(--nova-muted)]">Expected net</dt>
            <dd>{expected != null ? <MoneyValue value={expected} /> : "— (not treated as ₹0)"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-[var(--nova-muted)]">Actual transferred</dt>
            <dd>{actual != null ? <MoneyValue value={actual} /> : "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-[var(--nova-muted)]">Unallocated / shortfall</dt>
            <dd>
              {remaining == null ? (
                "—"
              ) : (
                <>
                  <MoneyValue value={remaining} />
                  <span className="mt-1 block text-xs text-[var(--nova-muted)]">
                    A smaller payment does not reduce gross salary. Record unpaid balance vs approved
                    deduction explicitly.
                  </span>
                </>
              )}
            </dd>
          </div>
        </dl>

        {item.paymentStatus === "SALARY_STRUCTURE_INCOMPLETE" ? (
          <AlertBanner tone="warning">
            Historical salary structure is missing for this month.{" "}
            <a
              className="font-semibold underline"
              href={`/admin/companies/${item.companyId}/employees/${item.employeeId}`}
            >
              Open employee salary profile
            </a>{" "}
            before approving. Do not invent amounts to force a match.
          </AlertBanner>
        ) : null}

        <AlertBanner tone="info">
          Approving marks the payment ready for payroll issue later. It does not issue or email a
          payslip.
        </AlertBanner>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={!canEdit || !canApprove || !!busy}
            onClick={() => void review("approve")}
          >
            {busy === "approve" ? "Saving…" : "Approve for issue"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!canEdit || !!busy || !employeeId}
            onClick={() => void review("map")}
          >
            {busy === "map" ? "Saving…" : "Save mapping"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={!canEdit || !!busy}
            onClick={() => void review("reject")}
          >
            Reject match
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={!canEdit || !!busy}
            onClick={() => void review("non_payroll")}
          >
            Non-payroll
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={!canEdit || !!busy}
            onClick={() => void review("ignore")}
          >
            Ignore
          </Button>
        </div>
        {error ? <AlertBanner tone="danger">{error}</AlertBanner> : null}
      </div>
    </Modal>
  );
}

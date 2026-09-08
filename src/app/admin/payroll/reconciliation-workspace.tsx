"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, Input, Select, Label } from "@/components/ui";
import { AlertBanner, Meta, MoneyValue } from "@/components/industrial";
import { Modal } from "@/components/modal";
import { ReconciliationStatusBadge } from "@/components/reconciliation-status";
import {
  PaymentSearchCombobox,
  type PaymentComboboxOption,
} from "@/components/payment-search-combobox";
import type {
  PayrollReconciliationItem,
  ReconciliationFilter,
} from "@/server/payroll/unresolved-payments";

type EmployeeOption = { id: string; label: string };
type AllocatableTxn = {
  id: string;
  txnDate: string;
  displayDate?: string;
  particulars: string;
  debit: number | null;
  utrReference: string | null;
  reconciliationStatus: string;
  preferred?: boolean;
  inWindow?: boolean;
  excludedReason?: string;
  beneficiary?: string;
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
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function outcomeLabel(outcome: string | null | undefined) {
  switch (outcome) {
    case "EXACT_MATCH":
      return "Exact match";
    case "BELOW_EXPECTED_NET":
      return "Below expected net";
    case "ABOVE_EXPECTED_NET":
      return "Above expected net";
    case "MULTIPLE_CANDIDATES":
      return "Ambiguous candidates";
    case "NO_CANDIDATE":
      return "No candidate found";
    case "HISTORICAL_SALARY_REQUIRED":
      return "Historical salary required";
    case "IDENTITY_UNCERTAIN":
      return "Identity uncertain";
    case "PAYMENT_ALREADY_ALLOCATED":
      return "Payment already allocated";
    default:
      return "Not run yet";
  }
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
  searchWindowDisplay,
  defaultDaysBefore,
  defaultDaysAfter,
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
  searchWindowDisplay: string;
  defaultDaysBefore: number;
  defaultDaysAfter: number;
  employees: EmployeeOption[];
  allocatableTransactions: AllocatableTxn[];
  canEdit: boolean;
  canApprove: boolean;
  approvalBlockedReason?: string;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [daysBefore, setDaysBefore] = useState(String(defaultDaysBefore));
  const [daysAfter, setDaysAfter] = useState(String(defaultDaysAfter));
  const [matchBusy, setMatchBusy] = useState(false);
  const [matchError, setMatchError] = useState("");
  const [matchSummary, setMatchSummary] = useState<string>("");
  const selected = useMemo(
    () => items.find((item) => item.lineId === selectedId) ?? null,
    [items, selectedId],
  );

  async function runAutoMatch() {
    setMatchBusy(true);
    setMatchError("");
    setMatchSummary("Matching uploaded bank payments…");
    try {
      const response = await fetch(`/api/payroll/runs/${runId}/auto-match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          daysBefore: Number(daysBefore),
          daysAfter: Number(daysAfter),
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Auto-match failed");
      const s = body.summary;
      setMatchSummary(
        `Completed · checked ${s.employeesChecked} · searched ${s.transactionsSearched} (excluded ${s.transactionsExcluded}) · linked ${s.autoLinked} · exact ${s.exactMatches} · amount diffs ${s.amountDifferences} · ambiguous ${s.ambiguousMatches} · no candidate ${s.noCandidates} · window ${s.searchWindow.display}`,
      );
      router.refresh();
    } catch (cause) {
      setMatchError(cause instanceof Error ? cause.message : "Auto-match failed");
      setMatchSummary("");
    } finally {
      setMatchBusy(false);
    }
  }

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
        <Link
          href={`/admin/payroll?companyId=${companyId}`}
          className="inline-flex min-h-11 items-center rounded-[var(--nova-radius-sm)] px-3 text-sm font-semibold text-[var(--nova-teal)] hover:underline"
        >
          ← Back to Payroll
        </Link>
      </div>

      <Card className="space-y-3 p-4">
        <div className="text-sm font-semibold text-[var(--nova-ink)]">Payment search window</div>
        <p className="text-sm text-[var(--nova-text-secondary)]">{searchWindowDisplay}</p>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label>Days before month start</Label>
            <Input
              type="number"
              className="w-28"
              value={daysBefore}
              onChange={(e) => setDaysBefore(e.target.value)}
              disabled={!canEdit || matchBusy}
            />
          </div>
          <div>
            <Label>Days after month end</Label>
            <Input
              type="number"
              className="w-28"
              value={daysAfter}
              onChange={(e) => setDaysAfter(e.target.value)}
              disabled={!canEdit || matchBusy}
            />
          </div>
          <Button
            type="button"
            disabled={!canEdit || matchBusy}
            onClick={() => void runAutoMatch()}
          >
            {matchBusy ? "Matching uploaded bank payments…" : "Run Auto-Match Again"}
          </Button>
        </div>
        {matchSummary ? <AlertBanner tone="success">{matchSummary}</AlertBanner> : null}
        {matchError ? <AlertBanner tone="danger">{matchError}</AlertBanner> : null}
        {!canEdit ? (
          <AlertBanner tone="warning">
            Auto-match requires statements reconcile permission.
          </AlertBanner>
        ) : null}
      </Card>

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
            item.matchExplanation ||
            item.approvalReason ||
            item.transaction?.reviewReason ||
            item.transaction?.matchExplanation ||
            outcomeLabel(item.matchOutcome);
          const suggested = item.matchCandidates[0];
          return (
            <Card key={item.lineId} className="p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <ReconciliationStatusBadge status={item.paymentStatus} />
                    <Meta>{outcomeLabel(item.matchOutcome)}</Meta>
                    <Meta>
                      {item.transaction
                        ? formatDate(item.transaction.valueDate ?? item.transaction.txnDate)
                        : suggested
                          ? formatDate(suggested.txnDate)
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
                      (suggested
                        ? `Suggested: ${suggested.particulars}`
                        : item.matchOutcome === "NO_CANDIDATE"
                          ? "No candidate found in the payment search window."
                          : item.matchOutcome
                            ? "No payment linked yet — review suggestions or choose a debit."
                            : "Matching not run yet for this line.")}
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
                        ) : suggested ? (
                          <MoneyValue value={suggested.debit} />
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
                  <p className="text-xs text-[var(--nova-muted)]">Match: {reason}</p>
                  {item.matchCandidates.length > 1 ? (
                    <p className="text-xs text-[var(--nova-muted)]">
                      Candidates:{" "}
                      {item.matchCandidates
                        .slice(0, 3)
                        .map(
                          (candidate) =>
                            `₹${candidate.debit.toLocaleString("en-IN")} (${candidate.identityScore})`,
                        )
                        .join(" · ")}
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
          runId={runId}
          employees={employees}
          allocatableTransactions={allocatableTransactions}
          daysBefore={Number(daysBefore) || defaultDaysBefore}
          daysAfter={Number(daysAfter) || defaultDaysAfter}
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
  runId,
  employees,
  allocatableTransactions,
  daysBefore,
  daysAfter,
  canEdit,
  canApprove,
  approvalBlockedReason,
  onClose,
  onSaved,
}: {
  item: PayrollReconciliationItem;
  runId: string;
  employees: EmployeeOption[];
  allocatableTransactions: AllocatableTxn[];
  daysBefore: number;
  daysAfter: number;
  canEdit: boolean;
  canApprove: boolean;
  approvalBlockedReason?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [employeeId, setEmployeeId] = useState(item.employeeId);
  const [transactionId, setTransactionId] = useState(item.primaryTxnId ?? "");
  const [selectedPayment, setSelectedPayment] = useState<PaymentComboboxOption | null>(null);
  const [salaryYear, setSalaryYear] = useState(String(item.year));
  const [salaryMonth, setSalaryMonth] = useState(String(item.month));
  const [varianceClassification, setVarianceClassification] = useState("");
  const [reason, setReason] = useState("");
  const [rememberAlias, setRememberAlias] = useState(false);
  const [busy, setBusy] = useState<ReviewAction | null>(null);
  const [error, setError] = useState("");

  const employeeLabel =
    employees.find((employee) => employee.id === employeeId)?.label ?? item.employeeName;

  const initialOptions: PaymentComboboxOption[] = useMemo(() => {
    const fromList: PaymentComboboxOption[] = allocatableTransactions.map((txn) => ({
      id: txn.id,
      displayDate: txn.displayDate ?? formatDate(txn.txnDate),
      particulars: txn.particulars,
      beneficiary: txn.beneficiary ?? "",
      debit: txn.debit,
      utrReference: txn.utrReference,
      matchExplanation: txn.excludedReason
        ? `Excluded: ${txn.excludedReason}`
        : txn.preferred
          ? "Preferred in payment window"
          : "Eligible debit",
      allocationStatus: txn.reconciliationStatus,
      recommended: Boolean(txn.preferred),
      preferred: Boolean(txn.preferred),
      excludedReason: txn.excludedReason,
    }));
    if (item.transaction && !fromList.some((row) => row.id === item.transaction!.id)) {
      fromList.unshift({
        id: item.transaction.id,
        displayDate: formatDate(item.transaction.valueDate ?? item.transaction.txnDate),
        particulars: item.transaction.particulars,
        beneficiary: "",
        debit: item.transaction.debit,
        utrReference: item.transaction.utrReference,
        matchExplanation: item.transaction.matchExplanation ?? "Currently linked",
        allocationStatus: item.transaction.reconciliationStatus,
        recommended: true,
        preferred: true,
      });
    }
    for (const candidate of item.matchCandidates) {
      if (fromList.some((row) => row.id === candidate.transactionId)) continue;
      fromList.unshift({
        id: candidate.transactionId,
        displayDate: formatDate(candidate.txnDate),
        particulars: candidate.particulars,
        beneficiary: "",
        debit: candidate.debit,
        utrReference: null,
        matchExplanation: candidate.identityExplanation,
        allocationStatus: "Suggested",
        recommended: true,
        preferred: true,
      });
    }
    return fromList;
  }, [allocatableTransactions, item]);

  const selectedTxn =
    selectedPayment ??
    initialOptions.find((txn) => txn.id === transactionId) ??
    null;

  const expected = item.expectedAmount;
  const actual = selectedTxn?.debit ?? item.actualAmount;
  const difference =
    expected != null && actual != null ? Math.round((actual - expected) * 100) / 100 : null;

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
          rememberBeneficiaryAlias: rememberAlias && (action === "map" || action === "approve"),
          payrollRunId: runId,
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
          <div className="font-semibold">Confirm before save</div>
          <dl className="mt-2 grid gap-2 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase text-[var(--nova-muted)]">Employee</dt>
              <dd>{employeeLabel}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-[var(--nova-muted)]">Beneficiary</dt>
              <dd>{selectedTxn?.beneficiary || selectedTxn?.particulars?.slice(0, 80) || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-[var(--nova-muted)]">Payroll month</dt>
              <dd>
                {String(salaryMonth).padStart(2, "0")}/{salaryYear}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-[var(--nova-muted)]">Payment date</dt>
              <dd>{selectedTxn?.displayDate ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-[var(--nova-muted)]">Expected net</dt>
              <dd>{expected != null ? <MoneyValue value={expected} /> : "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-[var(--nova-muted)]">Actual payment</dt>
              <dd>{actual != null ? <MoneyValue value={actual} /> : "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-[var(--nova-muted)]">Difference</dt>
              <dd>{difference != null ? <MoneyValue value={difference} /> : "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-[var(--nova-muted)]">Match reason</dt>
              <dd className="text-[var(--nova-text-secondary)]">
                {selectedTxn?.matchExplanation ||
                  item.matchExplanation ||
                  outcomeLabel(item.matchOutcome)}
              </dd>
            </div>
          </dl>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Employee (company-scoped)</Label>
            <Select
              value={employeeId}
              onChange={(e) => {
                setEmployeeId(e.target.value);
                setTransactionId("");
                setSelectedPayment(null);
              }}
              disabled={!canEdit}
            >
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="sm:col-span-2">
            <PaymentSearchCombobox
              companyId={item.companyId}
              year={Number(salaryYear)}
              month={Number(salaryMonth)}
              employeeId={employeeId}
              value={transactionId}
              daysBefore={daysBefore}
              daysAfter={daysAfter}
              initialOptions={initialOptions}
              disabled={!canEdit}
              onChange={(id, option) => {
                setTransactionId(id);
                setSelectedPayment(option);
              }}
            />
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

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={rememberAlias}
            disabled={!canEdit}
            onChange={(e) => setRememberAlias(e.target.checked)}
          />
          <span>
            Remember this beneficiary for future payroll (stores an approved alias; never learned
            from unconfirmed suggestions)
          </span>
        </label>

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
          Approving marks the payment ready for payroll issue later. Matching and mapping do not
          issue or email a payslip.
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

import { prisma } from "@/server/db";
import { BracketLabel, Meta, AlertBanner, MoneyValue, StatCell } from "@/components/industrial";
import { Card } from "@/components/ui";
import {
  RECONCILIATION_STATUS_META,
  ReconciliationStatusBadge,
} from "@/components/reconciliation-status";
import { isUnresolvedPaymentStatus } from "@/server/payroll/payment-decision";
import { t } from "@/i18n";
import { ReconciliationReviewControls } from "./reconciliation-review-controls";
import { ProfitClassificationControl } from "./profit-classification-control";

const SUMMARY_ORDER = [
  "MATCHED_EXACT",
  "PARTIAL_PAYMENT_REVIEW_REQUIRED",
  "AMOUNT_MISMATCH_REVIEW_REQUIRED",
  "SALARY_STRUCTURE_INCOMPLETE",
  "UNMATCHED",
  "APPROVED_FOR_ISSUE",
] as const;

/** Rows that are settled and no longer accept review actions. */
const CLOSED_STATUSES = new Set(["ISSUED", "EMAIL_SENT", "NON_PAYROLL", "IGNORED"]);

function difference(expected: number | null, actual: number | null): number | null {
  if (expected == null || actual == null) return null;
  return Math.round((actual - expected) * 100) / 100;
}

export async function ReconciliationPanel({
  statementId,
  companyId,
}: {
  statementId?: string;
  companyId?: string;
}) {
  if (!statementId || !companyId) return null;

  const [statement, txns, employees] = await Promise.all([
    prisma.bankStatement.findFirst({
      where: { id: statementId, companyId },
      select: { id: true, salaryYear: true, salaryMonth: true, status: true },
    }),
    prisma.statementTransaction.findMany({
      where: { statementId, statement: { companyId } },
      include: {
        matchedEmployee: { select: { id: true, employeeCode: true, firstName: true, lastName: true } },
        matchSuggestions: {
          include: { employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true } } },
          orderBy: { score: "desc" },
          take: 3,
        },
      },
      orderBy: { rowIndex: "asc" },
    }),
    // Company-scoped only: an employee of another company can never be mapped here.
    prisma.employee.findMany({
      where: { companyId, status: "ACTIVE" },
      select: { id: true, employeeCode: true, firstName: true, lastName: true },
      orderBy: { employeeCode: "asc" },
    }),
  ]);

  if (!statement) return null;

  const employeeOptions = employees.map((employee) => ({
    id: employee.id,
    label: `${employee.employeeCode} · ${employee.firstName} ${employee.lastName}`,
  }));

  const counts = txns.reduce<Record<string, number>>((acc, txn) => {
    acc[txn.reconciliationStatus] = (acc[txn.reconciliationStatus] ?? 0) + 1;
    return acc;
  }, {});
  const needsReview = txns.filter((txn) => isUnresolvedPaymentStatus(txn.reconciliationStatus)).length;

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BracketLabel>{t("en", "admin.reconciliation")}</BracketLabel>
        <Meta>
          {statement.salaryMonth && statement.salaryYear
            ? `Fallback period ${String(statement.salaryMonth).padStart(2, "0")}/${statement.salaryYear}`
            : "Periods derived per debit from bank dates (multi-month OK)"}
        </Meta>
      </div>

      <div className="mt-3">
        <AlertBanner tone={needsReview ? "warning" : "info"}>
          {needsReview
            ? `${needsReview} transaction(s) need a decision. Partial payments and amount mismatches are never issued automatically.`
            : "Every transaction has a decision. Only exact matches and approved rows can be issued."}
        </AlertBanner>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SUMMARY_ORDER.map((status) => (
          <StatCell
            key={status}
            label={RECONCILIATION_STATUS_META[status].label}
            value={counts[status] ?? 0}
            alert={
              isUnresolvedPaymentStatus(status) &&
              status !== "UNMATCHED" &&
              (counts[status] ?? 0) > 0
            }
          />
        ))}
      </div>

      <div className="mt-5 grid gap-3">
        {txns.map((txn) => {
          const expected = txn.expectedAmount != null ? Number(txn.expectedAmount) : null;
          const actual =
            txn.actualAmount != null
              ? Number(txn.actualAmount)
              : txn.debit != null
                ? Number(txn.debit)
                : null;
          const delta =
            txn.varianceAmount != null ? Number(txn.varianceAmount) : difference(expected, actual);
          const closed = CLOSED_STATUSES.has(txn.reconciliationStatus);
          const requiresVarianceReason =
            txn.reconciliationStatus === "PARTIAL_PAYMENT_REVIEW_REQUIRED" ||
            txn.reconciliationStatus === "AMOUNT_MISMATCH_REVIEW_REQUIRED";

          return (
            <Card key={txn.id} className="p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <ReconciliationStatusBadge status={txn.reconciliationStatus} />
                    <Meta>{txn.txnDate.toLocaleDateString()}</Meta>
                    {txn.salaryYear && txn.salaryMonth ? (
                      <Meta>
                        Payroll {String(txn.salaryMonth).padStart(2, "0")}/{txn.salaryYear}
                      </Meta>
                    ) : null}
                    {txn.isDuplicate ? <Meta>Deduped</Meta> : null}
                    {txn.utrReference ? <Meta>UTR {txn.utrReference}</Meta> : null}
                  </div>
                  <div className="mt-2 text-sm font-medium text-[var(--nova-ink)]">
                    {txn.particulars}
                  </div>
                  <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="text-xs uppercase tracking-[0.06em] text-[var(--nova-muted)]">
                        Expected
                      </dt>
                      <dd>{expected != null ? <MoneyValue value={expected} /> : "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-[0.06em] text-[var(--nova-muted)]">
                        Actual
                      </dt>
                      <dd>{actual != null ? <MoneyValue value={actual} /> : "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-[0.06em] text-[var(--nova-muted)]">
                        Difference
                      </dt>
                      <dd
                        className={
                          delta != null && Math.abs(delta) > 0.01
                            ? "text-[var(--nova-warning)]"
                            : undefined
                        }
                      >
                        {delta != null ? <MoneyValue value={delta} /> : "—"}
                      </dd>
                    </div>
                  </dl>
                  {txn.matchedEmployee ? (
                    <p className="mt-2 text-sm text-[var(--nova-text-secondary)]">
                      Matched to {txn.matchedEmployee.employeeCode} ·{" "}
                      {txn.matchedEmployee.firstName} {txn.matchedEmployee.lastName}
                    </p>
                  ) : null}
                  {txn.reviewReason ? (
                    <p className="mt-1 text-xs text-[var(--nova-muted)]">
                      Review note: {txn.reviewReason}
                    </p>
                  ) : null}
                </div>

                <div className="rounded-[var(--nova-radius-sm)] bg-[var(--nova-surface-muted)] px-3 py-2 lg:max-w-sm lg:shrink-0">
                  <Meta className="mb-1">
                    Match confidence {txn.matchScore != null ? `${txn.matchScore}/100` : "—"}
                  </Meta>
                  <p className="text-xs text-[var(--nova-text-secondary)]">
                    {txn.matchExplanation ?? "Not evaluated yet."}
                  </p>
                  {txn.matchSuggestions.length ? (
                    <ul className="mt-2 space-y-1 text-xs text-[var(--nova-muted)]">
                      {txn.matchSuggestions.map((suggestion) => (
                        <li key={suggestion.id} className="flex items-center justify-between gap-2">
                          <span>
                            {suggestion.employee.employeeCode} · {suggestion.employee.firstName}{" "}
                            {suggestion.employee.lastName}
                          </span>
                          <span className="tabular-nums">{suggestion.score}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>

              {closed ? (
                <p className="mt-3 border-t border-[var(--nova-border)] pt-3 text-xs text-[var(--nova-muted)]">
                  This transaction is settled and no longer accepts review actions.
                </p>
              ) : (
                <ReconciliationReviewControls
                  transactionId={txn.id}
                  companyId={companyId}
                  employees={employeeOptions}
                  matchedEmployeeId={txn.matchedEmployeeId}
                  requiresVarianceReason={requiresVarianceReason}
                />
              )}
              <ProfitClassificationControl
                transactionId={txn.id}
                initialClassification={txn.classification}
              />
            </Card>
          );
        })}
      </div>
    </div>
  );
}

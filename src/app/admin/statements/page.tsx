import { requirePageUser } from "@/server/auth/page-guard";
import { AdminShell } from "@/components/admin-shell";
import { companyFacade } from "@/server/facades/company-facade";
import { prisma } from "@/server/db";
import {
  CompanyTabs,
  BracketLabel,
  DataRow,
  Meta,
  StatusBadge,
  AlertBanner,
  MoneyValue,
  EmptyState,
} from "@/components/industrial";
import { Card } from "@/components/ui";
import { t } from "@/i18n";
import { StatementUploadForm } from "./upload-form";

function matchTone(status: string): "success" | "warning" | "info" | "neutral" | "danger" {
  if (status === "ACCEPTED" || status === "AUTO_SELECTED") return "success";
  if (status === "NEEDS_REVIEW") return "warning";
  if (status === "REJECTED") return "danger";
  return "info";
}

export default async function StatementsPage({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string; statementId?: string }>;
}) {
  const user = await requirePageUser(["SUPER_ADMIN", "OPERATIONS_MANAGER"]);
  const sp = await searchParams;
  const companies = await companyFacade.listCompanies();
  const companyId = sp.companyId ?? companies[0]?.id;
  const statements = companyId
    ? await prisma.bankStatement.findMany({
        where: { companyId },
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { transactions: true } } },
      })
    : [];

  return (
    <AdminShell
      title={t("en", "admin.statements")}
      description="Upload account statements, monitor parsing, and reconcile transactions before payroll issue. Bank payment verification does not by itself determine salary components."
      userName={user.email ?? user.phone}
      userRole={user.globalRole}
    >
      <ol className="mb-6 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {[
          "Company & month",
          "Upload statement",
          "Parsing",
          "Reconcile",
          "Review payroll",
          "Issue payslips",
        ].map((step, i) => (
          <li
            key={step}
            className="rounded-[var(--nova-radius-sm)] border border-[var(--nova-border)] bg-[var(--nova-surface)] px-3 py-2 text-center text-xs font-semibold text-[var(--nova-text-secondary)]"
          >
            <span className="block text-[var(--nova-teal)]">{i + 1}</span>
            {step}
          </li>
        ))}
      </ol>

      <CompanyTabs
        companies={companies}
        activeId={companyId}
        hrefFor={(id) => `/admin/statements?companyId=${id}`}
      />
      {companyId ? <StatementUploadForm companyId={companyId} /> : null}
      <div className="mt-6 grid gap-3">
        {statements.map((s) => (
          <DataRow
            key={s.id}
            title={`${s.bankCode} statement`}
            subtitle={`${s._count.transactions} rows · ${s.createdAt.toLocaleString()} · checksum ${s.checksumSha256.slice(0, 12)}…`}
            action={
              <div className="flex items-center gap-2">
                <StatusBadge
                  status={s.status}
                  tone={
                    s.status === "PARSED"
                      ? "success"
                      : s.status === "FAILED"
                        ? "danger"
                        : "info"
                  }
                />
                <a
                  className="text-sm font-semibold text-[var(--nova-teal)] hover:underline"
                  href={`/admin/statements?companyId=${companyId}&statementId=${s.id}`}
                >
                  {t("en", "admin.reconciliation")}
                </a>
              </div>
            }
          />
        ))}
        {!statements.length ? (
          <EmptyState
            title="No statements uploaded"
            description="Upload a PDF, CSV, or XLSX account statement to begin reconciliation."
          />
        ) : null}
      </div>
      <ReconciliationPanel statementId={sp.statementId} companyId={companyId} />
    </AdminShell>
  );
}

async function ReconciliationPanel({
  statementId,
  companyId,
}: {
  statementId?: string;
  companyId?: string;
}) {
  if (!statementId || !companyId) return null;
  const txns = await prisma.statementTransaction.findMany({
    where: { statementId },
    include: {
      matchSuggestions: {
        include: { employee: true },
        orderBy: { score: "desc" },
        take: 3,
      },
    },
    orderBy: { rowIndex: "asc" },
  });

  const needsReview = txns.filter((t) =>
    t.matchSuggestions.some((m) => m.status === "NEEDS_REVIEW"),
  ).length;

  return (
    <div className="mt-8">
      <BracketLabel>{t("en", "admin.reconciliation")}</BracketLabel>
      <div className="mt-3">
        <AlertBanner tone="warning">{t("en", "admin.reconciliationNote")}</AlertBanner>
      </div>
      <p className="mt-3 text-sm text-[var(--nova-muted)]">
        {txns.length} transactions · {needsReview} with suggestions needing review. Matching
        confidence is advisory — confirm each classification deliberately.
      </p>
      <div className="mt-4 grid gap-3">
        {txns.map((txn) => {
          const top = txn.matchSuggestions[0];
          return (
            <Card key={txn.id} className="p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-[var(--nova-ink)]">{txn.particulars}</div>
                  <div className="mt-2 flex flex-wrap gap-3 text-sm text-[var(--nova-text-secondary)]">
                    <span>
                      Debit{" "}
                      {txn.debit != null ? <MoneyValue value={Number(txn.debit)} /> : "—"}
                    </span>
                    <span>
                      Credit{" "}
                      {txn.credit != null ? <MoneyValue value={Number(txn.credit)} /> : "—"}
                    </span>
                    <StatusBadge status={txn.classification} tone="neutral" />
                  </div>
                </div>
                <div className="rounded-[var(--nova-radius-sm)] bg-[var(--nova-surface-muted)] px-3 py-2 lg:max-w-sm lg:shrink-0">
                  <Meta className="mb-1">Suggested match (not final)</Meta>
                  {txn.matchSuggestions.length ? (
                    <ul className="space-y-1.5">
                      {txn.matchSuggestions.map((m) => (
                        <li key={m.id} className="flex items-center justify-between gap-2 text-sm">
                          <span>
                            {m.employee.firstName} {m.employee.lastName}
                          </span>
                          <span className="flex items-center gap-2">
                            <span className="tabular-nums text-xs text-[var(--nova-muted)]">
                              score {m.score}
                            </span>
                            <StatusBadge status={m.status} tone={matchTone(m.status)} />
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-[var(--nova-muted)]">{t("en", "admin.none")}</p>
                  )}
                  {top ? (
                    <p className="mt-2 text-xs text-[var(--nova-muted)]">
                      Narration beside candidate: confirm employee + components before payroll.
                    </p>
                  ) : null}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

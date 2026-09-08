import { prisma } from "@/server/db";
import { DataRow, StatusBadge, EmptyState } from "@/components/industrial";
import { t } from "@/i18n";
import { StatementUploadForm } from "@/app/admin/statements/upload-form";
import { ReconciliationPanel } from "@/app/admin/statements/reconciliation-panel";
import { StatementReparseButton } from "@/app/admin/statements/reparse-button";

function statementSubtitle(s: {
  status: string;
  parseError: string | null;
  createdAt: Date;
  checksumSha256: string;
  _count: { transactions: number };
}) {
  const base = `${s._count.transactions} rows · ${s.createdAt.toLocaleString()} · checksum ${s.checksumSha256.slice(0, 12)}…`;
  if (s.parseError) return `${base} · ${s.parseError}`;
  if (s._count.transactions === 0 && s.status === "UPLOADED") {
    return `${base} · waiting to parse (click Parse now)`;
  }
  return base;
}

export default async function CompanyStatementsPage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<{ statementId?: string }>;
}) {
  const { companyId } = await params;
  const sp = await searchParams;
  const statements = await prisma.bankStatement.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { transactions: true } } },
  });

  return (
    <div>
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

      <StatementUploadForm companyId={companyId} />
      <div className="mt-6 grid gap-3">
        {statements.map((s) => (
          <DataRow
            key={s.id}
            title={`${s.bankCode} statement`}
            subtitle={statementSubtitle(s)}
            action={
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge
                  status={s.status}
                  tone={
                    s.status === "PARSED" ? "success" : s.status === "FAILED" ? "danger" : "info"
                  }
                />
                <StatementReparseButton
                  statementId={s.id}
                  status={s.status}
                  rowCount={s._count.transactions}
                />
                <a
                  className="text-sm font-semibold text-[var(--nova-teal)] hover:underline"
                  href={`/admin/companies/${companyId}/statements?statementId=${s.id}`}
                >
                  {t("en", "admin.reconciliation")}
                </a>
                <a
                  className="text-sm font-semibold text-[var(--nova-teal)] hover:underline"
                  href={`/admin/payroll/reconciliation?companyId=${companyId}&filter=unresolved`}
                >
                  Review Payments
                </a>
              </div>
            }
          />
        ))}
        {!statements.length ? (
          <EmptyState
            title={t("en", "company.hub.noStatements")}
            description={t("en", "company.hub.noStatementsBody")}
          />
        ) : null}
      </div>
      <ReconciliationPanel statementId={sp.statementId} companyId={companyId} />
    </div>
  );
}

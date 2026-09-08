import { requirePageUser } from "@/server/auth/page-guard";
import { AdminShell } from "@/components/admin-shell";
import { companyFacade } from "@/server/facades/company-facade";
import { prisma } from "@/server/db";
import {
  CompanyTabs,
  DataRow,
  StatusBadge,
  EmptyState,
} from "@/components/industrial";
import { t } from "@/i18n";
import Link from "next/link";
import { StatementUploadForm } from "./upload-form";
import { ReconciliationPanel } from "./reconciliation-panel";
import { StatementReparseButton } from "./reparse-button";

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
      {companyId ? (
        <div className="mb-4">
          <Link
            href={`/admin/companies/${companyId}/statements`}
            className="text-sm font-semibold text-[var(--nova-teal)] hover:underline"
          >
            {t("en", "company.hub.openWorkspace")} →
          </Link>
        </div>
      ) : null}
      {companyId ? <StatementUploadForm companyId={companyId} /> : null}
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
                    s.status === "PARSED"
                      ? "success"
                      : s.status === "FAILED"
                        ? "danger"
                        : "info"
                  }
                />
                <StatementReparseButton
                  statementId={s.id}
                  status={s.status}
                  rowCount={s._count.transactions}
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

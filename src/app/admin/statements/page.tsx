import { requirePageUser } from "@/server/auth/page-guard";
import { AdminShell } from "@/components/admin-shell";
import { companyFacade } from "@/server/facades/company-facade";
import { prisma } from "@/server/db";
import { CompanyTabs, BracketLabel, DataRow, Meta } from "@/components/industrial";
import { Card } from "@/components/ui";
import { t } from "@/i18n";
import { StatementUploadForm } from "./upload-form";

export default async function StatementsPage({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string; statementId?: string }>;
}) {
  await requirePageUser(["SUPER_ADMIN", "OPERATIONS_MANAGER"]);
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
    <AdminShell title={t("en", "admin.statements")} kicker="BANK / INGEST">
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
            title={`${s.bankCode} · ${s.status}`}
            subtitle={`${s._count.transactions} rows · checksum ${s.checksumSha256.slice(0, 12)}…`}
            action={
              <a
                className="meta text-[var(--accent)]"
                href={`/admin/statements?companyId=${companyId}&statementId=${s.id}`}
              >
                &gt;&gt;&gt; {t("en", "admin.reconciliation")}
              </a>
            }
          />
        ))}
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
  return (
    <div className="mt-8">
      <BracketLabel>{t("en", "admin.reconciliation")}</BracketLabel>
      <div className="mt-2 border-2 border-[var(--ink)] bg-[var(--bg-alt)] p-3">
        <Meta className="normal-case tracking-[0.04em] text-[var(--muted)]">
          {t("en", "admin.reconciliationNote")}
        </Meta>
      </div>
      <div className="mt-4 grid gap-2">
        {txns.map((txn) => (
          <Card key={txn.id}>
            <div className="text-[0.75rem] tracking-[0.05em]">{txn.particulars}</div>
            <Meta className="mt-2 block">
              Debit {txn.debit?.toString() ?? "—"} · Credit {txn.credit?.toString() ?? "—"} ·{" "}
              {txn.classification}
            </Meta>
            <Meta className="mt-1 block text-[var(--muted)]">
              {t("en", "admin.suggestions")}:{" "}
              {txn.matchSuggestions.length
                ? txn.matchSuggestions
                    .map(
                      (m) =>
                        `${m.employee.firstName} ${m.employee.lastName} (${m.score}) [${m.status}]`,
                    )
                    .join("; ")
                : t("en", "admin.none")}
            </Meta>
          </Card>
        ))}
      </div>
    </div>
  );
}

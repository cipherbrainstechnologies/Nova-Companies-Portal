import { requirePageUser } from "@/server/auth/page-guard";
import { AdminShell } from "@/components/admin-shell";
import { companyFacade } from "@/server/facades/company-facade";
import { Card } from "@/components/ui";
import { t } from "@/i18n";
import { StatementUploadForm } from "./upload-form";
import { prisma } from "@/server/db";

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
    <AdminShell title={t("en", "admin.statements")}>
      <div className="mb-4 flex flex-wrap gap-2">
        {companies.map((c) => (
          <a
            key={c.id}
            href={`/admin/statements?companyId=${c.id}`}
            className={`rounded-md px-3 py-1 text-sm ${
              c.id === companyId ? "bg-[var(--ink)] text-[var(--paper)]" : "bg-[var(--paper-soft)]"
            }`}
          >
            {c.name}
          </a>
        ))}
      </div>
      {companyId ? <StatementUploadForm companyId={companyId} /> : null}
      <div className="mt-6 grid gap-3">
        {statements.map((s) => (
          <Card key={s.id}>
            <div className="font-semibold">
              {s.bankCode} · {s.status}
            </div>
            <div className="text-sm text-[var(--muted)]">
              {s._count.transactions} rows · checksum {s.checksumSha256.slice(0, 12)}…
            </div>
            <a
              className="mt-2 inline-block text-sm text-[var(--accent)]"
              href={`/admin/statements?companyId=${companyId}&statementId=${s.id}`}
            >
              Open reconciliation
            </a>
          </Card>
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
    include: { matchSuggestions: { include: { employee: true }, orderBy: { score: "desc" }, take: 3 } },
    orderBy: { rowIndex: "asc" },
  });
  return (
    <div className="mt-8">
      <h2 className="h-display mb-3 text-xl font-bold">Reconciliation</h2>
      <p className="mb-3 text-sm text-[var(--muted)]">
        Suggested matches only. Payslips are never issued from upload alone — classify, confirm employee, approve payroll, then issue.
      </p>
      <div className="grid gap-2">
        {txns.map((txn) => (
          <Card key={txn.id}>
            <div className="text-sm font-medium">{txn.particulars}</div>
            <div className="text-sm text-[var(--muted)]">
              Debit {txn.debit?.toString() ?? "—"} · Credit {txn.credit?.toString() ?? "—"} ·{" "}
              {txn.classification}
            </div>
            <div className="mt-1 text-xs text-[var(--muted)]">
              Suggestions:{" "}
              {txn.matchSuggestions.length
                ? txn.matchSuggestions
                    .map(
                      (m) =>
                        `${m.employee.firstName} ${m.employee.lastName} (${m.score}) [${m.status}]`,
                    )
                    .join("; ")
                : "none"}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

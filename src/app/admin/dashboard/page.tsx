import { requirePageUser } from "@/server/auth/page-guard";
import { AdminShell } from "@/components/admin-shell";
import { prisma } from "@/server/db";
import { Card } from "@/components/ui";
import { t } from "@/i18n";

export default async function AdminDashboardPage() {
  await requirePageUser(["SUPER_ADMIN", "OPERATIONS_MANAGER"]);
  const [companies, unmatched, pendingLines, statements] = await Promise.all([
    prisma.company.count(),
    prisma.statementMatchSuggestion.count({ where: { status: "NEEDS_REVIEW" } }),
    prisma.payrollEmployeeLine.count({ where: { status: "APPROVED" } }),
    prisma.bankStatement.count({ where: { status: { in: ["UPLOADED", "PARSING"] } } }),
  ]);

  return (
    <AdminShell title={t("en", "admin.dashboard")}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <div className="text-sm text-[var(--muted)]">Companies</div>
          <div className="mt-2 text-3xl font-semibold">{companies}</div>
        </Card>
        <Card>
          <div className="text-sm text-[var(--muted)]">Statements processing</div>
          <div className="mt-2 text-3xl font-semibold">{statements}</div>
        </Card>
        <Card>
          <div className="text-sm text-[var(--muted)]">Unmatched / needs review</div>
          <div className="mt-2 text-3xl font-semibold">{unmatched}</div>
        </Card>
        <Card>
          <div className="text-sm text-[var(--muted)]">Slips waiting issue</div>
          <div className="mt-2 text-3xl font-semibold">{pendingLines}</div>
        </Card>
      </div>
      <p className="mt-6 text-sm text-[var(--muted)]">
        Profit views separate earned operating profit from owner/financing outgoings. Bank balance is never labeled as profit.
      </p>
    </AdminShell>
  );
}

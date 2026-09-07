import { requirePageUser } from "@/server/auth/page-guard";
import { AdminShell } from "@/components/admin-shell";
import { prisma } from "@/server/db";
import { StatCell } from "@/components/industrial";
import { Meta } from "@/components/industrial";
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
    <AdminShell title={t("en", "admin.dashboard")} kicker="OPS / TELEMETRY">
      <div className="grid gap-px bg-[var(--ink)] sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-[var(--bg)]">
          <StatCell label={t("en", "admin.stat.companies")} value={companies} />
        </div>
        <div className="bg-[var(--bg)]">
          <StatCell label={t("en", "admin.stat.processing")} value={statements} />
        </div>
        <div className="bg-[var(--bg)]">
          <StatCell label={t("en", "admin.stat.review")} value={unmatched} alert={unmatched > 0} />
        </div>
        <div className="bg-[var(--bg)]">
          <StatCell label={t("en", "admin.stat.waiting")} value={pendingLines} alert={pendingLines > 0} />
        </div>
      </div>
      <div className="mt-6 border-2 border-[var(--ink)] bg-[var(--bg-alt)] p-4">
        <Meta className="text-[var(--muted)]">{t("en", "admin.profitNote")}</Meta>
      </div>
    </AdminShell>
  );
}

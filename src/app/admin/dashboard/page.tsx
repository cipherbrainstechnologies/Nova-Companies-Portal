import Link from "next/link";
import { requirePageUser } from "@/server/auth/page-guard";
import { AdminShell } from "@/components/admin-shell";
import { prisma } from "@/server/db";
import { StatCell, AlertBanner, DataRow, StatusBadge } from "@/components/industrial";
import { Button } from "@/components/ui";
import { t } from "@/i18n";

export default async function AdminDashboardPage() {
  const user = await requirePageUser(["SUPER_ADMIN", "OPERATIONS_MANAGER"]);
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [
    companies,
    unmatched,
    pendingLines,
    statements,
    activeEmployees,
    blockedEmployees,
    issuedPayslips,
    recentAudit,
    payrollRunsThisMonth,
  ] = await Promise.all([
    prisma.company.count(),
    prisma.statementMatchSuggestion.count({ where: { status: "NEEDS_REVIEW" } }),
    prisma.payrollEmployeeLine.count({ where: { status: "APPROVED" } }),
    prisma.bankStatement.count({ where: { status: { in: ["UPLOADED", "PARSING"] } } }),
    prisma.employee.count({ where: { status: "ACTIVE" } }),
    prisma.employee.count({ where: { status: "BLOCKED" } }),
    prisma.payslip.count({
      where: {
        status: "ISSUED",
        payrollRun: { year, month },
      },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.payrollRun.findMany({
      where: { year, month },
      include: { company: true, _count: { select: { lines: true } } },
      take: 8,
    }),
  ]);

  const actionNeeded = unmatched + pendingLines + statements;

  return (
    <AdminShell
      title={t("en", "admin.dashboard")}
      description={`Welcome back. You are signed in as ${user.globalRole === "SUPER_ADMIN" ? "Super Admin" : "Operations Manager"}. Review items that need attention, then continue payroll for ${String(month).padStart(2, "0")}/${year}.`}
      userName={user.email ?? user.phone}
      userRole={user.globalRole}
      actions={
        <>
          <Link href="/admin/statements">
            <Button>{t("en", "admin.uploadStatement")}</Button>
          </Link>
          <Link href="/admin/payroll">
            <Button variant="outline">{t("en", "admin.createPayroll")}</Button>
          </Link>
          <Link href="/admin/employees">
            <Button variant="ghost">{t("en", "admin.addEmployee")}</Button>
          </Link>
        </>
      }
    >
      {actionNeeded > 0 ? (
        <div className="mb-6">
          <AlertBanner tone="warning">
            {actionNeeded} item{actionNeeded === 1 ? "" : "s"} need attention — unmatched matches,
            approved lines waiting to issue, or statements still processing.
          </AlertBanner>
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCell label={t("en", "admin.stat.companies")} value={companies} hint="Active registry" />
        <StatCell
          label={t("en", "admin.stat.processing")}
          value={statements}
          alert={statements > 0}
          hint="Uploads parsing"
        />
        <StatCell
          label={t("en", "admin.stat.review")}
          value={unmatched}
          alert={unmatched > 0}
          hint="Match suggestions"
        />
        <StatCell
          label={t("en", "admin.stat.waiting")}
          value={pendingLines}
          alert={pendingLines > 0}
          hint="Approved, not issued"
        />
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCell label="Active employees" value={activeEmployees} />
        <StatCell
          label="Blocked employees"
          value={blockedEmployees}
          alert={blockedEmployees > 0}
        />
        <StatCell label={`Payslips issued (${String(month).padStart(2, "0")}/${year})`} value={issuedPayslips} />
        <StatCell label="Payroll runs this month" value={payrollRunsThisMonth.length} />
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.06em] text-[var(--nova-muted)]">
            Payroll this month
          </h2>
          {payrollRunsThisMonth.length ? (
            <div className="grid gap-2">
              {payrollRunsThisMonth.map((r) => (
                <DataRow
                  key={r.id}
                  title={`${r.company.name} · ${String(r.month).padStart(2, "0")}/${r.year}`}
                  subtitle={`${r._count.lines} employee lines`}
                  action={<StatusBadge status={r.status} tone="info" />}
                />
              ))}
            </div>
          ) : (
            <DataRow
              title="No payroll runs for this month yet"
              subtitle="Create a run from Payroll after statements are reconciled."
              action={
                <Link href="/admin/payroll">
                  <Button size="sm" variant="outline">
                    Open payroll
                  </Button>
                </Link>
              }
            />
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.06em] text-[var(--nova-muted)]">
            Recent activity
          </h2>
          <div className="grid gap-2">
            {recentAudit.map((l) => (
              <DataRow
                key={l.id}
                title={l.action}
                subtitle={`${l.entityType}${l.entityId ? ` · ${l.entityId.slice(0, 8)}…` : ""} · ${l.createdAt.toLocaleString()}`}
              />
            ))}
            {!recentAudit.length ? (
              <DataRow title="No audit events yet" subtitle="Actions will appear here as the team works." />
            ) : null}
          </div>
        </section>
      </div>

      <div className="mt-6">
        <AlertBanner tone="info">{t("en", "admin.profitNote")}</AlertBanner>
      </div>
    </AdminShell>
  );
}

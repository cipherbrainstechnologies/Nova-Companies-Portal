import Link from "next/link";
import { requirePageUser } from "@/server/auth/page-guard";
import { AdminShell } from "@/components/admin-shell";
import { prisma } from "@/server/db";
import { StatCell, DataRow, StatusBadge, AlertBanner } from "@/components/industrial";
import { Button } from "@/components/ui";
import { t } from "@/i18n";
import { BusinessOverviewView } from "@/components/admin/business-overview-view";
import { buildBusinessOverview, parseBusinessFilters } from "@/server/admin/business-metrics";
import { loadBusinessSnapshot, reportingPeriod } from "@/server/admin/load-business-snapshot";

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; country?: string; entity?: string; plan?: string }>;
}) {
  const user = await requirePageUser(["SUPER_ADMIN", "OPERATIONS_MANAGER"]);
  const search = await searchParams;
  const period = reportingPeriod(search);
  const now = new Date();
  const [snapshot, unmatched, pendingLines, statements] = await Promise.all([
    loadBusinessSnapshot({ ...period, now }),
    prisma.statementMatchSuggestion.count({ where: { status: "NEEDS_REVIEW" } }),
    prisma.payrollEmployeeLine.count({ where: { status: "APPROVED" } }),
    prisma.bankStatement.count({ where: { status: { in: ["UPLOADED", "PARSING"] } } }),
  ]);
  const overview = buildBusinessOverview(snapshot, parseBusinessFilters(search));
  const countries = [...new Set(snapshot.clients.map((client) => client.countryCode))].sort();

  return (
    <AdminShell
      title="Business overview"
      kicker="Super Admin"
      description="EOR clients, contracted service fees, receivables, and work that needs an owner. Payroll operations stay below."
      userName={user.email ?? user.phone}
      userRole={user.globalRole}
      actions={
        <>
          <Link href="/admin/clients">
            <Button>Clients</Button>
          </Link>
          <Link href="/admin/tasks">
            <Button variant="outline">Tasks</Button>
          </Link>
        </>
      }
    >
      <BusinessOverviewView overview={overview} companies={snapshot.companies} countries={countries} payroll={
        <section>
          <h2 className="mb-3 text-sm font-semibold text-[var(--nova-ink)]">Payroll operations</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCell label={t("en", "admin.stat.processing")} value={statements} alert={statements > 0} hint="Uploads parsing" />
            <StatCell label={t("en", "admin.stat.review")} value={unmatched} alert={unmatched > 0} hint="Match suggestions" />
            <StatCell label={t("en", "admin.stat.waiting")} value={pendingLines} alert={pendingLines > 0} hint="Approved, not issued" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/admin/statements"><Button size="sm" variant="outline">{t("en", "admin.uploadStatement")}</Button></Link>
            <Link href="/admin/payroll"><Button size="sm" variant="outline">{t("en", "admin.createPayroll")}</Button></Link>
          </div>
          {unmatched + pendingLines + statements === 0 ? (
            <div className="mt-3">
              <AlertBanner tone="info">No payroll items are waiting on review or issue.</AlertBanner>
            </div>
          ) : null}
          <PayrollPlaceholder />
        </section>
      } />
    </AdminShell>
  );
}

function PayrollPlaceholder() {
  return (
    <div className="mt-3">
      <DataRow
        title="Company profit stays on Finance"
        subtitle="Earned profit from bank statements is a different measure from EOR service revenue."
        action={
          <Link href="/admin/finance">
            <StatusBadge status="Open finance" tone="info" />
          </Link>
        }
      />
    </div>
  );
}

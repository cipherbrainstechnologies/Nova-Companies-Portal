import { requirePageUser } from "@/server/auth/page-guard";
import { AdminShell } from "@/components/admin-shell";
import { companyFacade } from "@/server/facades/company-facade";
import { AlertBanner, BracketLabel } from "@/components/industrial";
import { prisma } from "@/server/db";
import { t } from "@/i18n";
import { FinanceOverviewCards, ProfitForm } from "./profit-form";
import { ProfitPolicyEditor } from "./profit-policy-editor";

function n(v: { toString(): string } | number) {
  return Number(v);
}

export default async function FinancePage() {
  const user = await requirePageUser(["SUPER_ADMIN", "OPERATIONS_MANAGER"]);
  const companies = await companyFacade.listCompanies();
  const snapshots = await prisma.profitReportSnapshot.findMany({
    include: { company: true },
    orderBy: [{ year: "desc" }, { month: "desc" }],
    take: 240,
  });

  const companyIds = new Set(snapshots.map((s) => s.companyId));
  const totals = {
    revenue: snapshots.reduce((s, row) => s + n(row.revenue), 0),
    earnedOperatingProfit: snapshots.reduce((s, row) => s + n(row.earnedOperatingProfit), 0),
    cashRemaining: snapshots.reduce((s, row) => s + n(row.cashRemaining), 0),
    companiesReporting: companyIds.size,
  };

  const byPeriod = new Map<string, number>();
  for (const row of snapshots) {
    const key = `${row.year}-${String(row.month).padStart(2, "0")}`;
    byPeriod.set(key, (byPeriod.get(key) ?? 0) + n(row.earnedOperatingProfit));
  }
  const periods = [...byPeriod.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 12)
    .reverse();
  const mom = periods.map(([period, earnedOperatingProfit], idx) => {
    const prev = idx > 0 ? periods[idx - 1][1] : null;
    const growthPct =
      prev != null && prev !== 0
        ? ((earnedOperatingProfit - prev) / Math.abs(prev)) * 100
        : prev === 0 && earnedOperatingProfit !== 0
          ? 100
          : null;
    return { period, earnedOperatingProfit, growthPct };
  });

  return (
    <AdminShell
      title={t("en", "admin.finance")}
      description="Earned business profit for Nova Workforce and Nova Qore. Bank balance is never labelled as profit."
      userName={user.email ?? user.phone}
      userRole={user.globalRole}
    >
      <AlertBanner tone="info">{t("en", "admin.financeFormula")}</AlertBanner>

      <div className="mt-6">
        <FinanceOverviewCards totals={totals} mom={mom} />
      </div>

      <div className="mt-8">
        <BracketLabel>Compute for a company</BracketLabel>
        <div className="mt-3">
          <ProfitForm companies={companies.map((c) => ({ id: c.id, name: c.name }))} />
        </div>
      </div>

      <div className="mt-8">
        <ProfitPolicyEditor companies={companies.map((c) => ({ id: c.id, name: c.name }))} />
      </div>
    </AdminShell>
  );
}

import { requirePageUser } from "@/server/auth/page-guard";
import { AdminShell } from "@/components/admin-shell";
import { companyFacade } from "@/server/facades/company-facade";
import { AlertBanner, BracketLabel } from "@/components/industrial";
import { prisma } from "@/server/db";
import { t } from "@/i18n";
import { FinanceOverviewCards, ProfitForm } from "./profit-form";
import { ProfitPolicyEditor } from "./profit-policy-editor";
import { RecomputeProfitButton } from "./recompute-button";

function n(v: { toString(): string } | number) {
  return Number(v);
}

function periodKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export default async function FinancePage() {
  const user = await requirePageUser(["SUPER_ADMIN", "OPERATIONS_MANAGER"]);
  const companies = await companyFacade.listCompanies();
  const snapshots = await prisma.profitReportSnapshot.findMany({
    include: { company: true },
    orderBy: [{ year: "desc" }, { month: "desc" }],
    take: 240,
  });

  // Only months that actually have statement rows contribute to collective cards.
  const monthsWithTxns = await prisma.statementTransaction.findMany({
    where: { isDuplicate: false },
    select: {
      salaryYear: true,
      salaryMonth: true,
      txnDate: true,
      statement: { select: { companyId: true } },
    },
  });
  const liveKeys = new Set<string>();
  for (const txn of monthsWithTxns) {
    const year = txn.salaryYear ?? txn.txnDate.getUTCFullYear();
    const month = txn.salaryMonth ?? txn.txnDate.getUTCMonth() + 1;
    liveKeys.add(`${txn.statement.companyId}:${periodKey(year, month)}`);
  }

  const liveSnapshots = snapshots.filter((row) =>
    liveKeys.has(`${row.companyId}:${periodKey(row.year, row.month)}`),
  );

  const companyIds = new Set(liveSnapshots.map((s) => s.companyId));
  const totals = {
    revenue: liveSnapshots.reduce((s, row) => s + n(row.revenue), 0),
    earnedOperatingProfit: liveSnapshots.reduce((s, row) => s + n(row.earnedOperatingProfit), 0),
    cashRemaining: liveSnapshots.reduce((s, row) => s + n(row.cashRemaining), 0),
    companiesReporting: companyIds.size,
  };

  const byPeriod = new Map<
    string,
    { earned: number; complete: boolean; details: unknown }
  >();
  for (const row of liveSnapshots) {
    const key = periodKey(row.year, row.month);
    const details = row.detailsJson as { reconciliationStatus?: string } | null;
    const complete = details?.reconciliationStatus === "COMPLETE";
    const prev = byPeriod.get(key);
    byPeriod.set(key, {
      earned: (prev?.earned ?? 0) + n(row.earnedOperatingProfit),
      complete: (prev?.complete ?? true) && complete,
      details: row.detailsJson,
    });
  }

  const periods = [...byPeriod.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 12)
    .reverse();

  const mom = periods.map(([period, current], idx) => {
    const prev = idx > 0 ? periods[idx - 1][1] : null;
    let growthPct: number | null = null;
    let growthLabel: string | undefined;
    if (!current.complete || (prev && !prev.complete)) {
      growthLabel = "Not available — reconciliation incomplete";
    } else if (prev == null) {
      growthLabel = "Not available — reconciliation incomplete";
    } else if (prev.earned === 0) {
      growthLabel = "Not available — reconciliation incomplete";
    } else {
      growthPct = ((current.earned - prev.earned) / Math.abs(prev.earned)) * 100;
    }
    return {
      period,
      earnedOperatingProfit: current.earned,
      growthPct,
      growthLabel,
    };
  });

  const latestComputed = liveSnapshots[0]?.createdAt;

  return (
    <AdminShell
      title={t("en", "admin.finance")}
      description="Earned business profit for Nova Workforce and Nova Qore. Bank balance is never labelled as profit."
      userName={user.email ?? user.phone}
      userRole={user.globalRole}
    >
      <AlertBanner tone="info">{t("en", "admin.financeFormula")}</AlertBanner>

      <div className="mt-4">
        <RecomputeProfitButton />
      </div>

      <div className="mt-6">
        <FinanceOverviewCards
          totals={totals}
          mom={mom}
          snapshotNote={
            latestComputed
              ? `Snapshot figures from live statement months only. Latest snapshot row ${latestComputed.toLocaleString()}. After importing statements or editing rules, click Recompute.`
              : "No profit snapshots yet — compute a company/month or click Recompute."
          }
        />
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

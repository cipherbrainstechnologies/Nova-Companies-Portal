"use client";

import { useState } from "react";
import { Button, Card, Input, Label, Select } from "@/components/ui";
import { Meta, BracketLabel, MoneyValue, AlertBanner, StatCell } from "@/components/industrial";
import { MonthYearPicker } from "@/components/month-year-picker";
import { t } from "@/i18n";

type ProfitResult = {
  profit?: {
    companyPrefix: string;
    companyName: string;
    period: string;
    revenue: number;
    businessExpenses: number;
    earnedOperatingProfit: number;
    ownerFinancingOutgoings: number;
    cashRemaining: number;
    storagePath: string;
    identities?: { earnedOperatingProfit: string; cashRemaining: string };
    lines?: Array<{ particulars: string; debit: number; credit: number; treatment: string }>;
  };
  labels?: Record<string, string>;
  error?: string;
};

export function ProfitForm({
  companies,
  initialCompanyId,
  lockCompanyId,
}: {
  companies: Array<{ id: string; name: string }>;
  initialCompanyId?: string;
  lockCompanyId?: boolean;
}) {
  const now = new Date();
  const [companyId, setCompanyId] = useState(initialCompanyId ?? companies[0]?.id ?? "");
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [result, setResult] = useState<ProfitResult | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(
      `/api/finance/profit?companyId=${companyId}&year=${year}&month=${month}`,
    );
    setResult(await res.json());
  }

  const p = result?.profit;
  const lockedName = companies.find((c) => c.id === companyId)?.name ?? companyId;

  return (
    <div className="space-y-4">
      <Card>
        <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
          <div>
            <Label>{t("en", "admin.company")}</Label>
            {lockCompanyId ? (
              <Input value={lockedName} readOnly disabled />
            ) : (
              <Select value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            )}
          </div>
          <MonthYearPicker
            year={year}
            month={month}
            onYearChange={setYear}
            onMonthChange={setMonth}
            idPrefix="profit"
          />
          <Button type="submit">{t("en", "admin.compute")}</Button>
        </form>
      </Card>

      {result?.error ? <AlertBanner tone="danger">{result.error}</AlertBanner> : null}

      {p ? (
        <div className="overflow-hidden rounded-[var(--nova-radius)] border border-[var(--nova-border)] bg-[var(--nova-surface)] shadow-[var(--nova-shadow)]">
          <div className="border-b border-[var(--nova-border)] bg-[var(--nova-surface-muted)] px-4 py-3">
            <BracketLabel>
              {p.companyName} · {p.period}
            </BracketLabel>
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Revenue", p.revenue],
              ["Business expenses", p.businessExpenses],
              ["Earned operating profit", p.earnedOperatingProfit],
              ["Owner / financing outgoings", p.ownerFinancingOutgoings],
              ["Cash remaining", p.cashRemaining],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="rounded-[var(--nova-radius-sm)] border border-[var(--nova-border)] bg-[var(--nova-canvas)] p-4"
              >
                <Meta>{label}</Meta>
                <div className="mt-2 text-2xl font-bold text-[var(--nova-ink)]">
                  <MoneyValue value={Number(value)} />
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-2 border-t border-[var(--nova-border)] bg-[var(--nova-surface-muted)] p-4">
            <p className="text-sm font-medium text-[var(--nova-teal)]">
              {p.identities?.earnedOperatingProfit}
            </p>
            <p className="text-sm font-medium text-[var(--nova-teal)]">
              {p.identities?.cashRemaining}
            </p>
            <AlertBanner tone="warning">
              {result?.labels?.notProfit ?? "Bank balance is never labeled as profit."}
            </AlertBanner>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function FinanceOverviewCards({
  totals,
  mom,
}: {
  totals: {
    revenue: number;
    earnedOperatingProfit: number;
    cashRemaining: number;
    companiesReporting: number;
  };
  mom: Array<{
    period: string;
    earnedOperatingProfit: number;
    growthPct: number | null;
  }>;
}) {
  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCell label="Companies with snapshots" value={totals.companiesReporting} />
        <StatCell
          label="Collective revenue"
          value={<MoneyValue value={totals.revenue} />}
          hint="All companies · stored snapshots"
        />
        <StatCell
          label="Collective operating profit"
          value={<MoneyValue value={totals.earnedOperatingProfit} />}
        />
        <StatCell
          label="Collective cash remaining"
          value={<MoneyValue value={totals.cashRemaining} />}
        />
      </section>

      <Card>
        <BracketLabel>Month on month · earned operating profit</BracketLabel>
        {mom.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-[var(--nova-border)] text-xs uppercase tracking-[0.06em] text-[var(--nova-muted)]">
                <tr>
                  <th className="py-2 pr-4">Period</th>
                  <th className="py-2 pr-4">Operating profit</th>
                  <th className="py-2">Growth %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--nova-border)]">
                {mom.map((row) => (
                  <tr key={row.period}>
                    <td className="py-2.5 pr-4 font-medium">{row.period}</td>
                    <td className="py-2.5 pr-4 tabular-nums">
                      <MoneyValue value={row.earnedOperatingProfit} />
                    </td>
                    <td
                      className={`py-2.5 font-semibold tabular-nums ${
                        row.growthPct == null
                          ? "text-[var(--nova-muted)]"
                          : row.growthPct >= 0
                            ? "text-[var(--nova-success)]"
                            : "text-[var(--nova-danger)]"
                      }`}
                    >
                      {row.growthPct == null
                        ? "—"
                        : `${row.growthPct > 0 ? "+" : ""}${row.growthPct.toFixed(1)}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-sm text-[var(--nova-muted)]">
            Compute profit for companies below to build month-on-month history.
          </p>
        )}
      </Card>
    </div>
  );
}

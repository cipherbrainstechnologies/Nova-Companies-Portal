"use client";

import { useState } from "react";
import { Button, Card, Input, Label, Select } from "@/components/ui";
import { Meta, BracketLabel, MoneyValue, AlertBanner, StatCell } from "@/components/industrial";
import { MonthYearPicker } from "@/components/month-year-picker";
import { t } from "@/i18n";

type ProfitLine = {
  particulars: string;
  debit: number;
  credit: number;
  treatment: string;
  categoryKey?: string;
  categoryLabel?: string;
};

type PersonalFinancing = {
  homeLoan: number;
  bajajEmi: number;
  creditCard: number;
  ownerTransfers: number;
  otherOutflows: number;
  corePersonalFinance: number;
  otherPersonalOutgoings: number;
  total: number;
};

type ProfitResult = {
  profit?: {
    companyPrefix: string;
    companyName: string;
    period: string;
    revenue: number;
    salariesOvertime: number;
    cashSalaryPayments: number;
    cbdtTax: number;
    otherBusinessExpenses: number;
    businessExpenses: number;
    earnedOperatingProfit: number;
    ownerFinancingOutgoings: number;
    profitAfterPersonalFinance: number;
    cashRemainingAfterDeductions: number;
    cashRemaining: number;
    personalFinancing: PersonalFinancing;
    unclassified: {
      count: number;
      totalDebit: number;
      totalCredit: number;
      lines: ProfitLine[];
    };
    storagePath: string;
    identities?: {
      earnedOperatingProfit: string;
      profitAfterPersonalFinance: string;
      cashRemainingAfterDeductions: string;
      cashRemaining?: string;
    };
    lines?: ProfitLine[];
  };
  labels?: Record<string, string>;
  error?: string;
};

function LineRow({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-[var(--nova-border)] py-2 last:border-0">
      <span className={muted ? "text-[var(--nova-muted)]" : "text-[var(--nova-text-secondary)]"}>
        {label}
      </span>
      <span className="tabular-nums font-medium text-[var(--nova-ink)]">
        <MoneyValue value={value} />
      </span>
    </div>
  );
}

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
  const pf = p?.personalFinancing;

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
        <div className="space-y-4">
          <div className="overflow-hidden rounded-[var(--nova-radius)] border border-[var(--nova-border)] bg-[var(--nova-surface)] shadow-[var(--nova-shadow)]">
            <div className="border-b border-[var(--nova-border)] bg-[var(--nova-surface-muted)] px-4 py-3">
              <BracketLabel>
                {p.companyName} · {p.period}
              </BracketLabel>
            </div>

            <section className="border-b border-[var(--nova-border)] p-4">
              <BracketLabel>1 · Earned business profit</BracketLabel>
              <p className="mt-1 text-sm text-[var(--nova-muted)]">
                Actual business credits only. Bank balance growth is never profit.
              </p>
              <div className="mt-3">
                <LineRow label="Revenue" value={p.revenue} />
                <LineRow label="Salaries / overtime" value={-(p.salariesOvertime ?? 0)} />
                <LineRow label="Salary-related cash payments" value={-(p.cashSalaryPayments ?? 0)} />
                <LineRow label="CBDT / business tax" value={-(p.cbdtTax ?? 0)} />
                {(p.otherBusinessExpenses ?? 0) !== 0 ? (
                  <LineRow label="Other business expenses" value={-(p.otherBusinessExpenses ?? 0)} />
                ) : null}
                <div className="mt-3 flex items-baseline justify-between gap-4 rounded-[var(--nova-radius-sm)] bg-[var(--nova-canvas)] px-3 py-3">
                  <span className="font-semibold text-[var(--nova-ink)]">Earned operating profit</span>
                  <span className="text-xl font-bold tabular-nums text-[var(--nova-teal)]">
                    <MoneyValue value={p.earnedOperatingProfit} />
                  </span>
                </div>
                <p className="mt-2 text-sm text-[var(--nova-teal)]">
                  {p.identities?.earnedOperatingProfit}
                </p>
              </div>
            </section>

            <section className="border-b border-[var(--nova-border)] p-4">
              <BracketLabel>2 · Personal and financing deductions</BracketLabel>
              <p className="mt-1 text-sm text-[var(--nova-muted)]">
                Shown separately. These never replace or alter earned business profit.
              </p>
              <div className="mt-3">
                <LineRow label="Home loan" value={-(pf?.homeLoan ?? 0)} />
                <LineRow label="Bajaj EMI" value={-(pf?.bajajEmi ?? 0)} />
                <LineRow label="Credit-card payment" value={-(pf?.creditCard ?? 0)} />
                <LineRow label="Owner / Love transfers" value={-(pf?.ownerTransfers ?? 0)} />
                <LineRow label="Threads cheque / other outflows" value={-(pf?.otherOutflows ?? 0)} />
                <LineRow
                  label="Total personal / financing"
                  value={-(pf?.total ?? p.ownerFinancingOutgoings)}
                  muted
                />
              </div>
            </section>

            <section className="border-b border-[var(--nova-border)] p-4">
              <BracketLabel>3 · Cash remaining after deductions</BracketLabel>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[var(--nova-radius-sm)] border border-[var(--nova-border)] bg-[var(--nova-canvas)] p-4">
                  <Meta>After home loan + Bajaj + credit card</Meta>
                  <div className="mt-2 text-2xl font-bold text-[var(--nova-ink)]">
                    <MoneyValue value={p.profitAfterPersonalFinance ?? p.earnedOperatingProfit} />
                  </div>
                  <p className="mt-2 text-xs text-[var(--nova-muted)]">
                    {p.identities?.profitAfterPersonalFinance}
                  </p>
                </div>
                <div className="rounded-[var(--nova-radius-sm)] border border-[var(--nova-border)] bg-[var(--nova-canvas)] p-4">
                  <Meta>Actual remaining after other outgoings</Meta>
                  <div className="mt-2 text-2xl font-bold text-[var(--nova-teal)]">
                    <MoneyValue value={p.cashRemainingAfterDeductions ?? p.cashRemaining} />
                  </div>
                  <p className="mt-2 text-xs text-[var(--nova-muted)]">
                    {p.identities?.cashRemainingAfterDeductions}
                  </p>
                </div>
              </div>
            </section>

            <section className="p-4">
              <BracketLabel>4 · Unclassified / needs review</BracketLabel>
              <p className="mt-1 text-sm text-[var(--nova-muted)]">
                These never silently affect earned profit totals.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <StatCell label="Count" value={p.unclassified?.count ?? 0} />
                <StatCell
                  label="Total debit"
                  value={<MoneyValue value={p.unclassified?.totalDebit ?? 0} />}
                />
                <StatCell
                  label="Total credit"
                  value={<MoneyValue value={p.unclassified?.totalCredit ?? 0} />}
                />
              </div>
              {(p.unclassified?.lines?.length ?? 0) > 0 ? (
                <ul className="mt-4 max-h-56 space-y-2 overflow-y-auto text-sm">
                  {p.unclassified!.lines.map((row, idx) => (
                    <li
                      key={`${row.particulars}-${idx}`}
                      className="flex justify-between gap-3 border-b border-[var(--nova-border)] py-2"
                    >
                      <span className="min-w-0 truncate">{row.particulars}</span>
                      <span className="shrink-0 tabular-nums">
                        {row.debit > 0 ? (
                          <MoneyValue value={-row.debit} />
                        ) : (
                          <MoneyValue value={row.credit} />
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-[var(--nova-muted)]">No unclassified transactions.</p>
              )}
            </section>

            <div className="border-t border-[var(--nova-border)] bg-[var(--nova-surface-muted)] p-4">
              <AlertBanner tone="warning">
                {result?.labels?.notProfit ??
                  "Bank balance, opening/closing balances, and internal transfers are never labelled as profit."}
              </AlertBanner>
            </div>
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
          label="Collective earned profit"
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
                  <th className="py-2 pr-4">Earned profit</th>
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

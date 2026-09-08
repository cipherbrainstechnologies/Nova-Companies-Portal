"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, Label, Select } from "@/components/ui";
import { AlertBanner, BracketLabel, Meta, MoneyValue, StatCell } from "@/components/industrial";

type Growth = { changeAmount: number | null; growthPct: number | null; label: string };

type MonthRow = {
  period: string;
  opening: number | null;
  credits: number;
  debits: number;
  netCashMovement: number;
  closing: number | null;
  businessRevenue: number;
  businessExpenses: number;
  earnedProfit: number;
  provisional: boolean;
  partialMonth: boolean;
  status: string;
  growth: Growth;
};

type CompanyLedger = {
  companyId: string;
  companyName: string;
  openingBalance: number | null;
  closingBalance: number | null;
  netIncrease: number | null;
  months: MonthRow[];
  statements: Array<{
    id: string;
    transactionCount: number | null;
    totalCredits: number | null;
    totalDebits: number | null;
    statementReconciled: boolean;
    reconciliationDifference: number | null;
    parseError: string | null;
  }>;
};

export function FinanceLedgerPanel({
  companies,
}: {
  companies: Array<{ id: string; name: string }>;
}) {
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "ALL");
  const [growthMetric, setGrowthMetric] = useState("earnedProfit");
  const [data, setData] = useState<{ companies: CompanyLedger[]; computedAt?: string } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/finance/ledger?companyId=${companyId}&growthMetric=${growthMetric}`,
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load ledger");
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, [companyId, growthMetric]);

  useEffect(() => {
    void load();
  }, [load]);

  const company = data?.companies?.[0];

  return (
    <div className="space-y-4">
      <Card className="space-y-4 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <BracketLabel>Statement-based finance ledger</BracketLabel>
            <p className="mt-1 text-sm text-[var(--nova-muted)]">
              Bank ledger includes every credit and debit. Business profit uses classified rows only
              and is labelled Provisional while classifications remain open.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div>
              <Label>Company</Label>
              <Select value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
                <option value="ALL">All authorised companies</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Growth metric</Label>
              <Select value={growthMetric} onChange={(e) => setGrowthMetric(e.target.value)}>
                <option value="earnedProfit">Earned profit</option>
                <option value="businessRevenue">Business revenue</option>
                <option value="businessExpenses">Business expenses</option>
                <option value="netCashMovement">Net cash movement</option>
                <option value="closing">Closing bank balance</option>
              </Select>
            </div>
            <Button type="button" variant="outline" disabled={loading} onClick={() => void load()}>
              {loading ? "Loading…" : "Refresh"}
            </Button>
          </div>
        </div>
        {data?.computedAt ? <Meta>Calculated {new Date(data.computedAt).toLocaleString()}</Meta> : null}
        {error ? <AlertBanner tone="danger">{error}</AlertBanner> : null}
      </Card>

      {(data?.companies ?? []).map((companyRow) => (
        <Card key={companyRow.companyId} className="space-y-4 p-4">
          <BracketLabel>{companyRow.companyName}</BracketLabel>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCell
              label="Opening"
              value={
                companyRow.openingBalance == null ? (
                  "No data"
                ) : (
                  <MoneyValue value={companyRow.openingBalance} />
                )
              }
            />
            <StatCell
              label="Closing"
              value={
                companyRow.closingBalance == null ? (
                  "No data"
                ) : (
                  <MoneyValue value={companyRow.closingBalance} />
                )
              }
            />
            <StatCell
              label="Net increase"
              value={
                companyRow.netIncrease == null ? (
                  "No data"
                ) : (
                  <MoneyValue value={companyRow.netIncrease} />
                )
              }
            />
          </div>

          {companyRow.statements.some((s) => !s.statementReconciled) ? (
            <AlertBanner tone="warning">
              Statement reconciliation failed for one or more uploads. Affected totals are not final.
            </AlertBanner>
          ) : null}

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-[var(--nova-border)] text-xs uppercase tracking-[0.06em] text-[var(--nova-muted)]">
                <tr>
                  <th className="py-2 pr-3">Month</th>
                  <th className="py-2 pr-3">Opening</th>
                  <th className="py-2 pr-3">Credits</th>
                  <th className="py-2 pr-3">Debits</th>
                  <th className="py-2 pr-3">Net cash</th>
                  <th className="py-2 pr-3">Closing</th>
                  <th className="py-2 pr-3">Biz revenue</th>
                  <th className="py-2 pr-3">Biz expenses</th>
                  <th className="py-2 pr-3">Earned profit</th>
                  <th className="py-2 pr-3">Change ₹</th>
                  <th className="py-2 pr-3">Change %</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--nova-border)]">
                {companyRow.months.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-4 text-[var(--nova-muted)]">
                      No data
                    </td>
                  </tr>
                ) : (
                  companyRow.months.map((row) => (
                    <tr key={row.period}>
                      <td className="py-2 pr-3 font-medium">{row.period}</td>
                      <td className="py-2 pr-3 tabular-nums">
                        {row.opening == null ? "No data" : <MoneyValue value={row.opening} />}
                      </td>
                      <td className="py-2 pr-3 tabular-nums">
                        <MoneyValue value={row.credits} />
                      </td>
                      <td className="py-2 pr-3 tabular-nums">
                        <MoneyValue value={row.debits} />
                      </td>
                      <td className="py-2 pr-3 tabular-nums">
                        <MoneyValue value={row.netCashMovement} />
                      </td>
                      <td className="py-2 pr-3 tabular-nums">
                        {row.closing == null ? "No data" : <MoneyValue value={row.closing} />}
                      </td>
                      <td className="py-2 pr-3 tabular-nums">
                        <MoneyValue value={row.businessRevenue} />
                      </td>
                      <td className="py-2 pr-3 tabular-nums">
                        <MoneyValue value={row.businessExpenses} />
                      </td>
                      <td className="py-2 pr-3 tabular-nums">
                        <MoneyValue value={row.earnedProfit} />
                        {row.provisional ? (
                          <span className="ml-1 text-xs text-[var(--nova-warning)]">Provisional</span>
                        ) : null}
                      </td>
                      <td className="py-2 pr-3 tabular-nums">
                        {row.growth.changeAmount == null ? (
                          "—"
                        ) : (
                          <MoneyValue value={row.growth.changeAmount} />
                        )}
                      </td>
                      <td className="py-2 pr-3 text-xs">{row.growth.label}</td>
                      <td className="py-2 text-xs">
                        {row.partialMonth ? "Partial" : row.status}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ))}

      {!loading && !company && !error ? (
        <AlertBanner tone="info">Upload or reprocess statements to populate the ledger.</AlertBanner>
      ) : null}
    </div>
  );
}

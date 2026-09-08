"use client";

import { useMemo, useState } from "react";
import { Button, Card, Input, Label, Select } from "@/components/ui";
import { Meta, MoneyValue, AlertBanner, BracketLabel } from "@/components/industrial";
import { MonthYearPicker } from "@/components/month-year-picker";
import { t } from "@/i18n";

type Projection = {
  projectedAnnualTax?: number;
  deductedYtd?: number;
  remaining?: number;
  monthlyTds?: number;
  annualTaxable?: number;
  standardDeduction?: number;
  disclaimer?: string;
};

const EARNING_PRESETS = [
  { key: "basic", label: "Basic / consolidated" },
  { key: "hra", label: "HRA" },
  { key: "special", label: "Special allowance" },
  { key: "other", label: "Other taxable" },
] as const;

export function TdsCalculatorForm() {
  const now = new Date();
  const [regime, setRegime] = useState<"NEW" | "OLD">("NEW");
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [components, setComponents] = useState<Record<string, string>>({
    basic: "25000",
    hra: "5000",
    special: "3000",
    other: "2000",
  });
  const [deductedYtd, setDeductedYtd] = useState("0");
  const [result, setResult] = useState<Projection | null>(null);
  const [error, setError] = useState("");

  const monthlyTaxable = useMemo(
    () =>
      Object.values(components).reduce((sum, v) => {
        const n = Number(v);
        return sum + (Number.isFinite(n) ? n : 0);
      }, 0),
    [components],
  );

  const monthsElapsed = useMemo(() => {
    const m = Number(month);
    return Number.isFinite(m) && m >= 1 && m <= 12 ? m : 1;
  }, [month]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/tds/project", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        monthlyTaxableComponents: monthlyTaxable,
        monthsElapsed,
        deductedYtd: Number(deductedYtd) || 0,
        regime,
        config: {
          slabs:
            regime === "NEW"
              ? [
                  { upTo: 300000, rate: 0 },
                  { upTo: 700000, rate: 0.05 },
                  { upTo: 1000000, rate: 0.1 },
                  { upTo: null, rate: 0.15 },
                ]
              : [
                  { upTo: 250000, rate: 0 },
                  { upTo: 500000, rate: 0.05 },
                  { upTo: 1000000, rate: 0.2 },
                  { upTo: null, rate: 0.3 },
                ],
          standardDeduction: regime === "NEW" ? 75000 : 50000,
        },
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setResult(null);
      setError(data.error ?? t("en", "common.failed"));
      return;
    }
    setResult(data.projection ?? data);
  }

  return (
    <div className="space-y-4">
      <Card>
        <BracketLabel>Salary bifurcation</BracketLabel>
        <p className="mt-2 text-sm text-[var(--nova-muted)]">
          Enter monthly taxable components to estimate annual tax and suggested monthly TDS. This is
          a calculator — not a filed return.
        </p>
        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {EARNING_PRESETS.map((row) => (
              <div key={row.key}>
                <Label htmlFor={`comp-${row.key}`}>{row.label}</Label>
                <Input
                  id={`comp-${row.key}`}
                  inputMode="decimal"
                  value={components[row.key] ?? "0"}
                  onChange={(e) =>
                    setComponents((prev) => ({ ...prev, [row.key]: e.target.value }))
                  }
                />
              </div>
            ))}
          </div>

          <div className="rounded-[var(--nova-radius-sm)] bg-[var(--nova-surface-muted)] px-3 py-2 text-sm">
            Monthly taxable total:{" "}
            <strong className="tabular-nums">
              <MoneyValue value={monthlyTaxable} />
            </strong>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <MonthYearPicker
              year={year}
              month={month}
              onYearChange={setYear}
              onMonthChange={setMonth}
              yearLabel="Tax year context"
              monthLabel="Months elapsed through"
              idPrefix="tds"
            />
            <div>
              <Label>Regime</Label>
              <Select value={regime} onChange={(e) => setRegime(e.target.value as "NEW" | "OLD")}>
                <option value="NEW">New regime</option>
                <option value="OLD">Old regime</option>
              </Select>
            </div>
            <div>
              <Label>TDS deducted YTD</Label>
              <Input value={deductedYtd} onChange={(e) => setDeductedYtd(e.target.value)} />
            </div>
            <Button type="submit">Calculate</Button>
          </div>
        </form>
      </Card>

      {error ? <AlertBanner tone="danger">{error}</AlertBanner> : null}

      {result ? (
        <Card>
          <BracketLabel>Estimate</BracketLabel>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-[var(--nova-radius-sm)] border border-[var(--nova-border)] p-3">
              <Meta>Monthly taxable</Meta>
              <div className="mt-1 text-xl font-bold">
                <MoneyValue value={monthlyTaxable} />
              </div>
            </div>
            <div className="rounded-[var(--nova-radius-sm)] border border-[var(--nova-border)] p-3">
              <Meta>Estimated annual tax</Meta>
              <div className="mt-1 text-xl font-bold">
                <MoneyValue value={Number(result.projectedAnnualTax ?? 0)} />
              </div>
            </div>
            <div className="rounded-[var(--nova-radius-sm)] border border-[var(--nova-border)] p-3">
              <Meta>Already deducted</Meta>
              <div className="mt-1 text-xl font-bold">
                <MoneyValue value={Number(result.deductedYtd ?? 0)} />
              </div>
            </div>
            <div className="rounded-[var(--nova-radius-sm)] border border-[var(--nova-border)] bg-[var(--nova-teal-soft)] p-3">
              <Meta>Suggested monthly TDS</Meta>
              <div className="mt-1 text-xl font-bold text-[var(--nova-teal)]">
                <MoneyValue value={Number(result.monthlyTds ?? result.remaining ?? 0)} />
              </div>
            </div>
          </div>
          {result.disclaimer ? (
            <div className="mt-4">
              <AlertBanner tone="warning">{String(result.disclaimer)}</AlertBanner>
            </div>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}

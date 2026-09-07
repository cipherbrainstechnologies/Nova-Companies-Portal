"use client";

import { useState } from "react";
import { Button, Card, Input, Label, Select } from "@/components/ui";
import { Meta, MoneyValue, AlertBanner } from "@/components/industrial";
import { t } from "@/i18n";

type Projection = {
  projectedAnnualTax?: number;
  deductedYtd?: number;
  remaining?: number;
  monthlyTds?: number;
  disclaimer?: string;
  [key: string]: unknown;
};

export function TdsCalculatorForm() {
  const [monthly, setMonthly] = useState("35000");
  const [regime, setRegime] = useState<"NEW" | "OLD">("NEW");
  const [result, setResult] = useState<Projection | null>(null);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/tds/project", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        monthlyTaxableComponents: Number(monthly),
        monthsElapsed: 5,
        deductedYtd: 0,
        regime,
        config: {
          slabs: [
            { upTo: 300000, rate: 0 },
            { upTo: 700000, rate: 0.05 },
            { upTo: 1000000, rate: 0.1 },
            { upTo: null, rate: 0.15 },
          ],
          standardDeduction: 75000,
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
    <Card>
      <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
        <div>
          <Label>{t("en", "admin.monthlyTaxable")}</Label>
          <Input value={monthly} onChange={(e) => setMonthly(e.target.value)} />
        </div>
        <div>
          <Label>Regime</Label>
          <Select value={regime} onChange={(e) => setRegime(e.target.value as "NEW" | "OLD")}>
            <option value="NEW">New regime</option>
            <option value="OLD">Old regime</option>
          </Select>
        </div>
        <Button type="submit">{t("en", "admin.projectTds")}</Button>
      </form>
      {error ? (
        <div className="mt-4">
          <AlertBanner tone="danger">{error}</AlertBanner>
        </div>
      ) : null}
      {result ? (
        <div className="mt-5 space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[var(--nova-radius-sm)] bg-[var(--nova-surface-muted)] p-3">
              <Meta>Estimated annual tax</Meta>
              <div className="mt-1 text-xl font-bold">
                <MoneyValue value={Number(result.projectedAnnualTax ?? 0)} />
              </div>
            </div>
            <div className="rounded-[var(--nova-radius-sm)] bg-[var(--nova-surface-muted)] p-3">
              <Meta>Deducted YTD</Meta>
              <div className="mt-1 text-xl font-bold">
                <MoneyValue value={Number(result.deductedYtd ?? 0)} />
              </div>
            </div>
            <div className="rounded-[var(--nova-radius-sm)] bg-[var(--nova-surface-muted)] p-3">
              <Meta>Suggested monthly TDS</Meta>
              <div className="mt-1 text-xl font-bold">
                <MoneyValue value={Number(result.monthlyTds ?? result.remaining ?? 0)} />
              </div>
            </div>
          </div>
          {result.disclaimer ? (
            <AlertBanner tone="warning">{String(result.disclaimer)}</AlertBanner>
          ) : null}
          <details className="rounded-[var(--nova-radius-sm)] border border-[var(--nova-border)] p-3">
            <summary className="cursor-pointer text-sm font-semibold">Full projection details</summary>
            <pre className="mt-2 overflow-auto text-xs text-[var(--nova-muted)]">
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </div>
      ) : !error ? (
        <Meta className="mt-3">Enter monthly taxable components to project TDS.</Meta>
      ) : null}
    </Card>
  );
}

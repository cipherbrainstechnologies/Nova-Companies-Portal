"use client";

import { useState } from "react";
import { Button, Card, Input, Label, Select } from "@/components/ui";
import { Meta, BracketLabel, MoneyValue, AlertBanner } from "@/components/industrial";
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
  const [companyId, setCompanyId] = useState(initialCompanyId ?? companies[0]?.id ?? "");
  const [year, setYear] = useState("2026");
  const [month, setMonth] = useState("9");
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
          <div>
            <Label>{t("en", "admin.year")}</Label>
            <Input value={year} onChange={(e) => setYear(e.target.value)} />
          </div>
          <div>
            <Label>{t("en", "admin.month")}</Label>
            <Input value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
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
            <Meta className="mt-2 break-all">{p.storagePath}</Meta>
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

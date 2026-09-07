"use client";

import { useState } from "react";
import { Button, Card, Input, Label, Select } from "@/components/ui";
import { Meta, BracketLabel } from "@/components/industrial";
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

export function ProfitForm({ companies }: { companies: Array<{ id: string; name: string }> }) {
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
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

  return (
    <div className="space-y-4">
      <Card>
        <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
          <div>
            <Label>{t("en", "admin.company")}</Label>
            <Select value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>{t("en", "admin.year")}</Label>
            <Input value={year} onChange={(e) => setYear(e.target.value)} />
          </div>
          <div>
            <Label>{t("en", "admin.month")}</Label>
            <Input value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
          <Button type="submit" className="min-h-12">
            {`>>> ${t("en", "admin.compute")}`}
          </Button>
        </form>
      </Card>

      {p ? (
        <div className="border-2 border-[var(--ink)]">
          <div className="border-b-2 border-[var(--ink)] bg-[var(--bg-alt)] px-4 py-3">
            <BracketLabel>
              profit/{p.companyPrefix}/{p.period}/
            </BracketLabel>
            <Meta className="mt-2 block break-all">{p.storagePath}</Meta>
          </div>
          <div className="grid gap-px bg-[var(--ink)] sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Revenue", p.revenue],
              ["Business expenses", p.businessExpenses],
              ["Earned operating profit", p.earnedOperatingProfit],
              ["Owner / financing outgoings", p.ownerFinancingOutgoings],
              ["Cash remaining", p.cashRemaining],
            ].map(([label, value]) => (
              <div key={String(label)} className="bg-[var(--bg)] p-4">
                <Meta className="text-[var(--muted)]">{label}</Meta>
                <div className="h-display mt-2 text-3xl tabular-nums">
                  {Number(value).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-2 border-t-2 border-[var(--ink)] bg-[var(--bg-alt)] p-4">
            <Meta className="block text-[var(--accent)]">
              MATH · {p.identities?.earnedOperatingProfit}
            </Meta>
            <Meta className="block text-[var(--accent)]">
              MATH · {p.identities?.cashRemaining}
            </Meta>
            <Meta className="block normal-case tracking-[0.04em] text-[var(--muted)]">
              {result?.labels?.notProfit ?? "Bank balance is never labeled as profit."}
            </Meta>
          </div>
        </div>
      ) : null}
    </div>
  );
}

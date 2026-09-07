"use client";

import { useState } from "react";
import { Button, Card, Input, Label, Select } from "@/components/ui";
import { t } from "@/i18n";

export function ProfitForm({ companies }: { companies: Array<{ id: string; name: string }> }) {
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [year, setYear] = useState("2026");
  const [month, setMonth] = useState("9");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(
      `/api/finance/profit?companyId=${companyId}&year=${year}&month=${month}`,
    );
    setResult(await res.json());
  }

  return (
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
        <Button type="submit">{`>>> ${t("en", "admin.compute")}`}</Button>
      </form>
      {result ? (
        <pre className="meta mt-4 overflow-auto border-2 border-[var(--ink)] bg-[var(--bg-alt)] p-3 text-[0.65rem] normal-case tracking-[0.02em]">
          {JSON.stringify(result, null, 2)}
        </pre>
      ) : null}
    </Card>
  );
}

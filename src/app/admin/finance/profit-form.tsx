"use client";

import { useState } from "react";
import { Button, Card, Input, Label } from "@/components/ui";

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
          <Label>Company</Label>
          <select
            className="w-full rounded-md border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-sm"
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Year</Label>
          <Input value={year} onChange={(e) => setYear(e.target.value)} />
        </div>
        <div>
          <Label>Month</Label>
          <Input value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
        <Button type="submit">Compute</Button>
      </form>
      {result ? (
        <pre className="mt-4 overflow-auto rounded-md bg-[var(--paper-soft)] p-3 text-xs">
          {JSON.stringify(result, null, 2)}
        </pre>
      ) : null}
    </Card>
  );
}

"use client";

import { useState } from "react";
import { Button, Card, Input, Label } from "@/components/ui";
import { Meta } from "@/components/industrial";
import { t } from "@/i18n";

export function TdsCalculatorForm() {
  const [monthly, setMonthly] = useState("35000");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/tds/project", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        monthlyTaxableComponents: Number(monthly),
        monthsElapsed: 5,
        deductedYtd: 0,
        regime: "NEW",
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
    setResult(await res.json());
  }

  return (
    <Card>
      <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
        <div>
          <Label>{t("en", "admin.monthlyTaxable")}</Label>
          <Input value={monthly} onChange={(e) => setMonthly(e.target.value)} />
        </div>
        <Button type="submit">&gt;&gt;&gt; {t("en", "admin.projectTds")}</Button>
      </form>
      {result ? (
        <pre className="meta mt-4 overflow-auto border-2 border-[var(--ink)] bg-[var(--bg-alt)] p-3 text-[0.65rem] normal-case tracking-[0.02em]">
          {JSON.stringify(result, null, 2)}
        </pre>
      ) : (
        <Meta className="mt-3 block text-[var(--muted)]">Awaiting projection input</Meta>
      )}
    </Card>
  );
}

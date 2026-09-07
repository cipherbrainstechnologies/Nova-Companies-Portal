"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label } from "@/components/ui";
import { t } from "@/i18n";

export function CreatePayrollForm({ companyId }: { companyId: string }) {
  const router = useRouter();
  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/payroll/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId, year: Number(year), month: Number(month) }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? t("en", "common.failed"));
      return;
    }
    router.refresh();
  }

  return (
    <Card>
      <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
        <div>
          <Label>{t("en", "admin.year")}</Label>
          <Input value={year} onChange={(e) => setYear(e.target.value)} />
        </div>
        <div>
          <Label>{t("en", "admin.month")}</Label>
          <Input value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
        <Button type="submit">&gt;&gt;&gt; {t("en", "admin.createPayroll")}</Button>
      </form>
      {error ? <p className="meta mt-2 text-[var(--accent)]">{'/// '} {error}</p> : null}
    </Card>
  );
}

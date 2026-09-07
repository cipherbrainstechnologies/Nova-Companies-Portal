"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label } from "@/components/ui";
import { AlertBanner } from "@/components/industrial";
import { t } from "@/i18n";

export function CreatePayrollForm({ companyId }: { companyId: string }) {
  const router = useRouter();
  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function createRun() {
    const res = await fetch("/api/payroll/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId, year: Number(year), month: Number(month) }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? t("en", "common.failed"));
      setConfirmOpen(false);
      return;
    }
    setConfirmOpen(false);
    router.refresh();
  }

  return (
    <Card>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError("");
          setConfirmOpen(true);
        }}
        className="flex flex-wrap items-end gap-3"
      >
        <div>
          <Label>{t("en", "admin.year")}</Label>
          <Input value={year} onChange={(e) => setYear(e.target.value)} />
        </div>
        <div>
          <Label>{t("en", "admin.month")}</Label>
          <Input value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
        <Button type="submit">{t("en", "admin.createPayroll")}</Button>
      </form>
      {error ? (
        <div className="mt-3">
          <AlertBanner tone="danger">{error}</AlertBanner>
        </div>
      ) : null}
      {confirmOpen ? (
        <div className="mt-4 rounded-[var(--nova-radius)] border border-[var(--nova-border)] bg-[var(--nova-surface-muted)] p-4">
          <p className="text-sm font-semibold text-[var(--nova-ink)]">Create payroll run?</p>
          <p className="mt-1 text-sm text-[var(--nova-muted)]">
            This creates a run for {String(month).padStart(2, "0")}/{year}. Issuing payslips later
            still requires explicit confirmation.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" onClick={() => void createRun()}>
              Confirm create
            </Button>
            <Button type="button" variant="ghost" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

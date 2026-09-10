"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";
import { AlertBanner, BracketLabel } from "@/components/industrial";
import { MonthYearPicker } from "@/components/month-year-picker";
import { t } from "@/i18n";

type Props = {
  companyId: string;
  canCreatePayroll: boolean;
  canDownloadPayslips: boolean;
  issuedByPeriod: Array<{ year: number; month: number; count: number }>;
};

export function GenerateSalarySlipsPanel({
  companyId,
  canCreatePayroll,
  canDownloadPayslips,
  issuedByPeriod,
}: Props) {
  const router = useRouter();
  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [downloadBusy, setDownloadBusy] = useState(false);

  const issuedCount = useMemo(() => {
    const y = Number(year);
    const m = Number(month);
    return issuedByPeriod.find((row) => row.year === y && row.month === m)?.count ?? 0;
  }, [issuedByPeriod, year, month]);

  async function createOrRefreshRun() {
    if (!canCreatePayroll) return;
    setBusy(true);
    setError("");
    setInfo("");
    const res = await fetch("/api/payroll/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId,
        year: Number(year),
        month: Number(month),
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? t("en", "common.failed"));
      return;
    }
    const d = data.diagnostics;
    if (d) {
      setInfo(
        t("en", "payslips.generate.summary")
          .replace("{found}", String(d.employeesFound ?? 0))
          .replace("{eligible}", String(d.eligibleEmployees ?? 0))
          .replace("{lines}", String(d.linesCreated ?? 0))
          .replace("{review}", String(d.salaryReviewRequired ?? 0)),
      );
    } else {
      setInfo(t("en", "payslips.generate.runReady"));
    }
    router.refresh();
  }

  async function downloadIssued() {
    if (!canDownloadPayslips) return;
    setDownloadBusy(true);
    setError("");
    const res = await fetch(
      `/api/companies/${companyId}/payslips/download-zip?year=${Number(year)}&month=${Number(month)}`,
    );
    const data = await res.json();
    setDownloadBusy(false);
    if (!res.ok) {
      setError(data.error ?? t("en", "common.downloadFailed"));
      return;
    }
    const items = (data.items ?? []) as Array<{ url: string; employeeCode: string }>;
    if (!items.length) {
      setError(t("en", "payslips.bulk.noneIssued"));
      return;
    }
    setInfo(
      t("en", "payslips.bulk.starting")
        .replace("{count}", String(items.length)),
    );
    for (const item of items) {
      const a = document.createElement("a");
      a.href = item.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.download = "";
      document.body.appendChild(a);
      a.click();
      a.remove();
      await new Promise((r) => setTimeout(r, 350));
    }
  }

  return (
    <Card className="mb-6">
      <BracketLabel>{t("en", "payslips.generate.title")}</BracketLabel>
      <p className="mt-1 text-sm text-[var(--nova-muted)]">{t("en", "payslips.generate.help")}</p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <MonthYearPicker
          year={year}
          month={month}
          onYearChange={setYear}
          onMonthChange={setMonth}
          idPrefix="company-payslips"
        />
        {canCreatePayroll ? (
          <Button type="button" onClick={() => void createOrRefreshRun()} disabled={busy}>
            {busy ? t("en", "common.loading") : t("en", "payslips.generate.createRefresh")}
          </Button>
        ) : null}
        <Link
          href={`/admin/companies/${companyId}/payroll`}
          className="inline-flex h-10 items-center rounded-[var(--nova-radius)] border border-[var(--nova-border)] px-3 text-sm font-semibold text-[var(--nova-teal)] hover:border-[var(--nova-teal)]"
        >
          {t("en", "payslips.generate.openPayroll")}
        </Link>
        {canDownloadPayslips ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => void downloadIssued()}
            disabled={downloadBusy || issuedCount === 0}
          >
            {downloadBusy
              ? t("en", "common.loading")
              : t("en", "payslips.bulk.downloadAll").replace("{count}", String(issuedCount))}
          </Button>
        ) : null}
      </div>

      <p className="mt-3 text-xs text-[var(--nova-muted)]">
        {t("en", "payslips.bulk.issuedCount").replace("{count}", String(issuedCount))}
      </p>

      {error ? (
        <div className="mt-3">
          <AlertBanner tone="danger">{error}</AlertBanner>
        </div>
      ) : null}
      {info ? (
        <div className="mt-3">
          <AlertBanner tone="success">{info}</AlertBanner>
        </div>
      ) : null}
    </Card>
  );
}

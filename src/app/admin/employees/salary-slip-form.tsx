"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label } from "@/components/ui";
import { AlertBanner, BracketLabel } from "@/components/industrial";
import { PayslipPreview } from "@/components/payslip-preview";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { t } from "@/i18n";

type EarningRow = { code: string; label: string; actual: string; payable: string };
type DeductionRow = { code: string; label: string; amount: string };

type Props = {
  companyId: string;
  employeeId: string;
  defaultBasic?: number;
};

function num(v: string) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function SalarySlipForm({ companyId, employeeId, defaultBasic }: Props) {
  const router = useRouter();
  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [working, setWorking] = useState({
    workingDays: "26",
    weeklyOffs: "4",
    paidHolidays: "0",
    presentDays: "26",
    casualLeave: "0",
    privilegedLeave: "0",
    sickLeave: "0",
    leaveWithoutPay: "0",
  });
  const [earnings, setEarnings] = useState<EarningRow[]>([
    {
      code: "BASIC",
      label: "Consolidated/Basic",
      actual: defaultBasic != null ? String(defaultBasic) : "0",
      payable: defaultBasic != null ? String(defaultBasic) : "0",
    },
  ]);
  const [deductions, setDeductions] = useState<DeductionRow[]>([
    { code: "PT", label: "Professional tax", amount: "0" },
  ]);
  const [cashComponent, setCashComponent] = useState("0");
  const [previewHtml, setPreviewHtml] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [, setLineId] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [issueOpen, setIssueOpen] = useState(false);

  const payload = useMemo(
    () => ({
      employeeId,
      companyId,
      year: Number(year),
      month: Number(month),
      earnings: earnings.map((e) => ({
        code: e.code,
        label: e.label,
        actual: num(e.actual),
        payable: num(e.payable),
      })),
      deductions: deductions.map((d) => ({
        code: d.code,
        label: d.label,
        amount: num(d.amount),
      })),
      working: {
        workingDays: num(working.workingDays),
        weeklyOffs: num(working.weeklyOffs),
        paidHolidays: num(working.paidHolidays),
        presentDays: num(working.presentDays),
        casualLeave: num(working.casualLeave),
        privilegedLeave: num(working.privilegedLeave),
        sickLeave: num(working.sickLeave),
        leaveWithoutPay: num(working.leaveWithoutPay),
      },
      cashComponent: num(cashComponent),
    }),
    [employeeId, companyId, year, month, earnings, deductions, working, cashComponent],
  );

  const refreshPreview = useCallback(async () => {
    const res = await fetch("/api/payroll/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok) setPreviewHtml(data.html ?? "");
  }, [payload]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void refreshPreview();
    }, 450);
    return () => window.clearTimeout(handle);
  }, [refreshPreview]);

  async function ensureRun(): Promise<string> {
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
    if (!res.ok) throw new Error(data.error ?? t("en", "common.failed"));
    setRunId(data.id);
    return data.id as string;
  }

  async function saveLine(approve: boolean) {
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const id = runId ?? (await ensureRun());
      const res = await fetch(`/api/payroll/runs/${id}/lines`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, approve }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("en", "common.failed"));
      setLineId(data.line?.id ?? null);
      if (approve) {
        const approveRes = await fetch(`/api/payroll/runs/${id}/approve`, { method: "POST" });
        const approveData = await approveRes.json();
        if (!approveRes.ok) {
          setMessage(t("en", "admin.lineApprovedRunPending"));
          setError(approveData.error ?? "");
          setBusy(false);
          router.refresh();
          return;
        }
        setMessage(t("en", "admin.lineSavedApproved"));
      } else {
        setMessage(t("en", "admin.lineSavedDraft"));
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("en", "common.failed"));
    } finally {
      setBusy(false);
    }
  }

  async function issuePayslip() {
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const id = runId ?? (await ensureRun());
      const lineRes = await fetch(`/api/payroll/runs/${id}/lines`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, approve: true }),
      });
      const lineData = await lineRes.json();
      if (!lineRes.ok) throw new Error(lineData.error ?? t("en", "common.failed"));
      const issuedLineId = lineData.line?.id as string | undefined;
      if (!issuedLineId) throw new Error(t("en", "common.failed"));
      setLineId(issuedLineId);

      const approveRes = await fetch(`/api/payroll/runs/${id}/approve`, { method: "POST" });
      const approveData = await approveRes.json();
      if (!approveRes.ok) throw new Error(approveData.error ?? t("en", "common.failed"));

      const issueRes = await fetch(`/api/payroll/runs/${id}/issue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          lineIds: [issuedLineId],
          confirmation: {
            count: 1,
            month: Number(month),
            companyId,
          },
        }),
      });
      const issueData = await issueRes.json();
      if (!issueRes.ok) throw new Error(issueData.error ?? t("en", "common.failed"));
      setMessage(t("en", "admin.issueQueued"));
      setIssueOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("en", "common.failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card className="space-y-5">
        <BracketLabel>{t("en", "admin.createSalarySlip")}</BracketLabel>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>{t("en", "admin.year")}</Label>
            <Input value={year} onChange={(e) => setYear(e.target.value)} />
          </div>
          <div>
            <Label>{t("en", "admin.month")}</Label>
            <Input value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-[var(--nova-ink)]">
            {t("en", "admin.workingDays")}
          </p>
          <div className="grid gap-3 sm:grid-cols-4">
            {(
              [
                ["workingDays", "WD"],
                ["weeklyOffs", "WO"],
                ["paidHolidays", "PH"],
                ["presentDays", "PD"],
                ["casualLeave", "CL"],
                ["privilegedLeave", "PL"],
                ["sickLeave", "SL"],
                ["leaveWithoutPay", "LWP"],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <Label>{label}</Label>
                <Input
                  value={working[key]}
                  onChange={(e) => setWorking((w) => ({ ...w, [key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-[var(--nova-ink)]">{t("en", "admin.earnings")}</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                setEarnings((rows) => [...rows, { code: "", label: "", actual: "0", payable: "0" }])
              }
            >
              {t("en", "admin.addRow")}
            </Button>
          </div>
          <div className="space-y-2">
            {earnings.map((row, idx) => (
              <div key={idx} className="grid gap-2 sm:grid-cols-4">
                <Input
                  placeholder={t("en", "admin.code")}
                  value={row.code}
                  onChange={(e) =>
                    setEarnings((rows) =>
                      rows.map((r, i) => (i === idx ? { ...r, code: e.target.value } : r)),
                    )
                  }
                />
                <Input
                  placeholder={t("en", "admin.label")}
                  value={row.label}
                  onChange={(e) =>
                    setEarnings((rows) =>
                      rows.map((r, i) => (i === idx ? { ...r, label: e.target.value } : r)),
                    )
                  }
                />
                <Input
                  placeholder={t("en", "admin.actual")}
                  value={row.actual}
                  onChange={(e) =>
                    setEarnings((rows) =>
                      rows.map((r, i) => (i === idx ? { ...r, actual: e.target.value } : r)),
                    )
                  }
                />
                <Input
                  placeholder={t("en", "admin.payable")}
                  value={row.payable}
                  onChange={(e) =>
                    setEarnings((rows) =>
                      rows.map((r, i) => (i === idx ? { ...r, payable: e.target.value } : r)),
                    )
                  }
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-[var(--nova-ink)]">
              {t("en", "admin.deductions")}
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                setDeductions((rows) => [...rows, { code: "", label: "", amount: "0" }])
              }
            >
              {t("en", "admin.addRow")}
            </Button>
          </div>
          <div className="space-y-2">
            {deductions.map((row, idx) => (
              <div key={idx} className="grid gap-2 sm:grid-cols-3">
                <Input
                  placeholder={t("en", "admin.code")}
                  value={row.code}
                  onChange={(e) =>
                    setDeductions((rows) =>
                      rows.map((r, i) => (i === idx ? { ...r, code: e.target.value } : r)),
                    )
                  }
                />
                <Input
                  placeholder={t("en", "admin.label")}
                  value={row.label}
                  onChange={(e) =>
                    setDeductions((rows) =>
                      rows.map((r, i) => (i === idx ? { ...r, label: e.target.value } : r)),
                    )
                  }
                />
                <Input
                  placeholder={t("en", "admin.amount")}
                  value={row.amount}
                  onChange={(e) =>
                    setDeductions((rows) =>
                      rows.map((r, i) => (i === idx ? { ...r, amount: e.target.value } : r)),
                    )
                  }
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label>{t("en", "admin.cashComponent")}</Label>
          <Input value={cashComponent} onChange={(e) => setCashComponent(e.target.value)} />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={() => void refreshPreview()}>
            {t("en", "admin.preview")}
          </Button>
          <Button type="button" disabled={busy} onClick={() => void saveLine(false)}>
            {t("en", "admin.saveDraft")}
          </Button>
          <Button type="button" variant="secondary" disabled={busy} onClick={() => void saveLine(true)}>
            {t("en", "admin.saveApprove")}
          </Button>
          <Button type="button" disabled={busy} onClick={() => setIssueOpen(true)}>
            {t("en", "admin.issuePayslip")}
          </Button>
        </div>
        {error ? <AlertBanner tone="danger">{error}</AlertBanner> : null}
        {message ? <AlertBanner tone="success">{message}</AlertBanner> : null}
      </Card>

      <Card>
        <PayslipPreview html={previewHtml} label={t("en", "admin.livePreview")} />
      </Card>

      <ConfirmDialog
        open={issueOpen}
        title={t("en", "admin.issueConfirmTitle")}
        description={t("en", "admin.issueConfirmBody")
          .replace("{month}", String(month).padStart(2, "0"))
          .replace("{year}", year)
          .replace("{count}", "1")}
        confirmLabel={t("en", "admin.issuePayslip")}
        busy={busy}
        onCancel={() => setIssueOpen(false)}
        onConfirm={() => void issuePayslip()}
      />
    </div>
  );
}

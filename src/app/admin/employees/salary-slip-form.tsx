"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label } from "@/components/ui";
import { AlertBanner, BracketLabel, MoneyValue } from "@/components/industrial";
import { PayslipPreview } from "@/components/payslip-preview";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { MonthYearPicker } from "@/components/month-year-picker";
import { t } from "@/i18n";

type EarningRow = { code: string; label: string; actual: string; payable: string; override?: boolean };
type DeductionRow = { code: string; label: string; amount: string; override?: boolean };

type PrefillResponse = {
  employee: { dateOfJoining: string | null; name: string; employeeCode: string };
  company: { attendanceBasis: string };
  calculation: {
    attendance: {
      workingDays: number;
      weeklyOffs: number;
      paidHolidays: number;
      presentDays: number;
      casualLeave: number;
      privilegedLeave: number;
      sickLeave: number;
      leaveWithoutPay: number;
      assumedFullAttendance: boolean;
      eligibleServiceDays: number;
      notes: string[];
    };
    earnings: Array<{
      code: string;
      label: string;
      actual: number;
      payable: number;
      overrideApplied: boolean;
    }>;
    deductions: Array<{ code: string; label: string; amount: number; overrideApplied: boolean }>;
    payableGross: number;
    grossDeductions: number;
    netAmount: number;
    expectedPaymentDate: string;
    warnings: string[];
    blockingIssues: string[];
    componentStructureRequired: boolean;
  };
  paymentMatch: {
    expectedPaymentDate: string;
    searchStart: string;
    searchEnd: string;
    suggestions: Array<{
      transactionId: string;
      debit: number | null;
      particulars: string;
      recommended: boolean;
    }>;
  };
  appliedCaReference: boolean;
  existingLine: { hasIssuedPayslip: boolean; status: string; paymentStatus: string } | null;
};

type Props = {
  companyId: string;
  employeeId: string;
  defaultBasic?: number;
};

function num(v: string) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

const ATTENDANCE_LABELS: Record<string, string> = {
  workingDays: "WD — calendar / policy denominator",
  weeklyOffs: "WO — weekly offs (informational; not added again to PD)",
  paidHolidays: "PH — paid holidays (informational; not added again to PD)",
  presentDays: "PD — payable days in employment",
  casualLeave: "CL — casual leave days",
  privilegedLeave: "PL — privileged leave days",
  sickLeave: "SL — sick leave days",
  leaveWithoutPay: "LWP — unpaid days within employment (not pre-joining)",
};

export function SalarySlipForm({ companyId, employeeId }: Props) {
  const router = useRouter();
  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [working, setWorking] = useState({
    workingDays: "0",
    weeklyOffs: "0",
    paidHolidays: "0",
    presentDays: "0",
    casualLeave: "0",
    privilegedLeave: "0",
    sickLeave: "0",
    leaveWithoutPay: "0",
  });
  const [earnings, setEarnings] = useState<EarningRow[]>([]);
  const [deductions, setDeductions] = useState<DeductionRow[]>([]);
  const [cashComponent, setCashComponent] = useState("0");
  const [previewHtml, setPreviewHtml] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [lineId, setLineId] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [issueOpen, setIssueOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [attendanceConfirmed, setAttendanceConfirmed] = useState(false);
  const [assumedAttendance, setAssumedAttendance] = useState(false);
  const [attendanceAssumption, setAttendanceAssumption] = useState<string | null>(null);
  const [expectedPaymentDate, setExpectedPaymentDate] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [blockingIssues, setBlockingIssues] = useState<string[]>([]);
  const [paymentHints, setPaymentHints] = useState<PrefillResponse["paymentMatch"] | null>(null);
  const [basisLabel, setBasisLabel] = useState("CALENDAR_DAY");
  const [totals, setTotals] = useState({ gross: 0, deductions: 0, net: 0 });
  const [issuedLocked, setIssuedLocked] = useState(false);
  const skipNextPrefill = useRef(false);
  const prefillSeq = useRef(0);

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
      attendanceConfirmed,
      attendanceAssumption,
      expectedPaymentDate: expectedPaymentDate || null,
    }),
    [
      employeeId,
      companyId,
      year,
      month,
      earnings,
      deductions,
      working,
      cashComponent,
      attendanceConfirmed,
      attendanceAssumption,
      expectedPaymentDate,
    ],
  );

  const applyPrefill = useCallback((data: PrefillResponse) => {
    const a = data.calculation.attendance;
    setWorking({
      workingDays: String(a.workingDays),
      weeklyOffs: String(a.weeklyOffs),
      paidHolidays: String(a.paidHolidays),
      presentDays: String(a.presentDays),
      casualLeave: String(a.casualLeave),
      privilegedLeave: String(a.privilegedLeave),
      sickLeave: String(a.sickLeave),
      leaveWithoutPay: String(a.leaveWithoutPay),
    });
    setEarnings(
      data.calculation.earnings.map((e) => ({
        code: e.code,
        label: e.label,
        actual: String(e.actual),
        payable: String(e.payable),
        override: e.overrideApplied,
      })),
    );
    setDeductions(
      data.calculation.deductions
        .filter((d) => d.amount !== 0 || d.overrideApplied)
        .map((d) => ({
          code: d.code,
          label: d.label,
          amount: String(d.amount),
          override: d.overrideApplied,
        })),
    );
    setAssumedAttendance(a.assumedFullAttendance);
    setAttendanceAssumption(a.assumedFullAttendance ? "ASSUMED_FULL_ATTENDANCE" : null);
    setAttendanceConfirmed(false);
    setExpectedPaymentDate(data.calculation.expectedPaymentDate);
    setWarnings(data.calculation.warnings);
    setBlockingIssues(data.calculation.blockingIssues);
    setPaymentHints(data.paymentMatch);
    setBasisLabel(data.company.attendanceBasis);
    setTotals({
      gross: data.calculation.payableGross,
      deductions: data.calculation.grossDeductions,
      net: data.calculation.netAmount,
    });
    setIssuedLocked(Boolean(data.existingLine?.hasIssuedPayslip));
    setDirty(false);
  }, []);

  const loadPrefill = useCallback(
    async (opts?: { force?: boolean; applyCa?: boolean }) => {
      if (issuedLocked && !opts?.force) return;
      if (dirty && !opts?.force) {
        const ok = window.confirm(t("en", "admin.prefillReplaceConfirm"));
        if (!ok) return;
      }
      const seq = ++prefillSeq.current;
      setBusy(true);
      setError("");
      try {
        const res = await fetch("/api/payroll/prefill", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyId,
            employeeId,
            year: Number(year),
            month: Number(month),
            assumeFullAttendance: true,
            applyParthAug2026CaOverrides: opts?.applyCa ?? false,
            leave: {
              weeklyOffs: num(working.weeklyOffs),
              paidHolidays: num(working.paidHolidays),
              casualLeave: num(working.casualLeave),
              privilegedLeave: num(working.privilegedLeave),
              sickLeave: num(working.sickLeave),
              leaveWithoutPay: num(working.leaveWithoutPay),
            },
          }),
        });
        const data = (await res.json()) as PrefillResponse & { error?: string };
        if (!res.ok) throw new Error(data.error ?? t("en", "common.failed"));
        if (seq !== prefillSeq.current) return;
        applyPrefill(data);
        setMessage(
          data.appliedCaReference
            ? t("en", "admin.prefillLoadedCa")
            : t("en", "admin.prefillLoaded"),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : t("en", "common.failed"));
      } finally {
        setBusy(false);
      }
    },
    [applyPrefill, companyId, dirty, employeeId, issuedLocked, month, working, year],
  );

  useEffect(() => {
    if (skipNextPrefill.current) {
      skipNextPrefill.current = false;
      return;
    }
    void loadPrefill({ force: true });
    // Intentional: reload when employee/month/year changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, employeeId, year, month]);

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

  function markDirty<T>(setter: (value: T) => void, value: T) {
    setDirty(true);
    setter(value);
  }

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
    if (issuedLocked) {
      setError(t("en", "admin.issuedLocked"));
      return;
    }
    if (approve && assumedAttendance && !attendanceConfirmed) {
      setError(t("en", "admin.confirmAttendanceFirst"));
      return;
    }
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
      setMessage(approve ? t("en", "admin.lineSavedApproved") : t("en", "admin.lineSavedDraft"));
      setDirty(false);
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
    if (issuedLocked) {
      setError(t("en", "admin.issuedLocked"));
      return;
    }
    if (assumedAttendance && !attendanceConfirmed) {
      setError(t("en", "admin.confirmAttendanceFirst"));
      return;
    }
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
      const issuedLineId = (lineData.line?.id as string | undefined) ?? lineId;
      if (!issuedLineId) throw new Error(t("en", "common.failed"));
      setLineId(issuedLineId);

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
      setIssuedLocked(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("en", "common.failed"));
    } finally {
      setBusy(false);
    }
  }

  const issueBlockedReason = issuedLocked
    ? t("en", "admin.issuedLocked")
    : assumedAttendance && !attendanceConfirmed
      ? t("en", "admin.confirmAttendanceFirst")
      : blockingIssues[0] ?? "";

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card className="space-y-5">
        <BracketLabel>{t("en", "admin.createSalarySlip")}</BracketLabel>
        <MonthYearPicker
          year={year}
          month={month}
          onYearChange={(v) => {
            setDirty(false);
            setYear(v);
          }}
          onMonthChange={(v) => {
            setDirty(false);
            setMonth(v);
          }}
          idPrefix="slip"
        />

        <div className="rounded-md border border-[var(--nova-line)] bg-[var(--nova-fog)]/40 p-3 text-sm">
          <p>
            {t("en", "admin.attendanceBasis")}: <strong>{basisLabel}</strong>
          </p>
          <p>
            {t("en", "admin.expectedPaymentDate")}:{" "}
            <strong>{expectedPaymentDate || "—"}</strong>
          </p>
          {paymentHints ? (
            <p className="text-[var(--nova-muted)]">
              {t("en", "admin.paymentSearchWindow")}: {paymentHints.searchStart} →{" "}
              {paymentHints.searchEnd}
            </p>
          ) : null}
        </div>

        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-[var(--nova-ink)]">
              {t("en", "admin.workingDays")}
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy || issuedLocked}
              onClick={() => void loadPrefill({ force: true })}
            >
              {t("en", "admin.recalculateFromSetup")}
            </Button>
          </div>
          {assumedAttendance ? (
            <AlertBanner tone="warning">
              {t("en", "admin.assumedAttendanceBanner")}
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={attendanceConfirmed}
                  disabled={issuedLocked}
                  onChange={(e) => {
                    setAttendanceConfirmed(e.target.checked);
                    setDirty(true);
                  }}
                />
                {t("en", "admin.confirmAttendance")}
              </label>
            </AlertBanner>
          ) : null}
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
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
              <div key={key} title={ATTENDANCE_LABELS[key]}>
                <Label>{label}</Label>
                <Input
                  value={working[key]}
                  disabled={issuedLocked}
                  onChange={(e) =>
                    markDirty(setWorking, { ...working, [key]: e.target.value })
                  }
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-[var(--nova-ink)]">
              {t("en", "admin.earnings")} ({t("en", "admin.fullMonth")} / {t("en", "admin.payable")})
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={issuedLocked}
              onClick={() =>
                markDirty(setEarnings, [
                  ...earnings,
                  { code: "", label: "", actual: "0", payable: "0" },
                ])
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
                  disabled={issuedLocked}
                  onChange={(e) =>
                    markDirty(
                      setEarnings,
                      earnings.map((r, i) => (i === idx ? { ...r, code: e.target.value } : r)),
                    )
                  }
                />
                <Input
                  placeholder={t("en", "admin.label")}
                  value={row.label}
                  disabled={issuedLocked}
                  onChange={(e) =>
                    markDirty(
                      setEarnings,
                      earnings.map((r, i) => (i === idx ? { ...r, label: e.target.value } : r)),
                    )
                  }
                />
                <Input
                  placeholder={t("en", "admin.actual")}
                  value={row.actual}
                  disabled={issuedLocked}
                  onChange={(e) =>
                    markDirty(
                      setEarnings,
                      earnings.map((r, i) => (i === idx ? { ...r, actual: e.target.value } : r)),
                    )
                  }
                />
                <Input
                  placeholder={t("en", "admin.payable")}
                  value={row.payable}
                  disabled={issuedLocked}
                  onChange={(e) =>
                    markDirty(
                      setEarnings,
                      earnings.map((r, i) => (i === idx ? { ...r, payable: e.target.value } : r)),
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
              disabled={issuedLocked}
              onClick={() =>
                markDirty(setDeductions, [...deductions, { code: "", label: "", amount: "0" }])
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
                  disabled={issuedLocked}
                  onChange={(e) =>
                    markDirty(
                      setDeductions,
                      deductions.map((r, i) => (i === idx ? { ...r, code: e.target.value } : r)),
                    )
                  }
                />
                <Input
                  placeholder={t("en", "admin.label")}
                  value={row.label}
                  disabled={issuedLocked}
                  onChange={(e) =>
                    markDirty(
                      setDeductions,
                      deductions.map((r, i) => (i === idx ? { ...r, label: e.target.value } : r)),
                    )
                  }
                />
                <Input
                  placeholder={t("en", "admin.amount")}
                  value={row.amount}
                  disabled={issuedLocked}
                  onChange={(e) =>
                    markDirty(
                      setDeductions,
                      deductions.map((r, i) => (i === idx ? { ...r, amount: e.target.value } : r)),
                    )
                  }
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label>{t("en", "admin.cashComponent")}</Label>
          <Input
            value={cashComponent}
            disabled={issuedLocked}
            onChange={(e) => markDirty(setCashComponent, e.target.value)}
          />
          <p className="mt-1 text-xs text-[var(--nova-muted)]">{t("en", "admin.cashComponentHint")}</p>
        </div>

        <div className="grid gap-2 rounded-md border border-[var(--nova-line)] p-3 text-sm sm:grid-cols-3">
          <div>
            {t("en", "admin.payableGross")}: <MoneyValue value={totals.gross} />
          </div>
          <div>
            {t("en", "admin.grossDeductions")}: <MoneyValue value={totals.deductions} />
          </div>
          <div>
            {t("en", "admin.netAmount")}: <MoneyValue value={totals.net} />
          </div>
        </div>

        {paymentHints?.suggestions?.length ? (
          <div className="space-y-1 text-sm">
            <p className="font-semibold">{t("en", "admin.paymentSuggestions")}</p>
            {paymentHints.suggestions.map((s) => (
              <p key={s.transactionId} className="text-[var(--nova-muted)]">
                {s.particulars.slice(0, 80)} — {s.debit ?? 0}
                {s.recommended ? ` (${t("en", "admin.recommended")})` : ""}
              </p>
            ))}
          </div>
        ) : null}

        {warnings.length ? (
          <AlertBanner tone="warning">
            <ul className="list-disc pl-4">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </AlertBanner>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={() => void refreshPreview()}>
            {t("en", "admin.preview")}
          </Button>
          <Button type="button" disabled={busy || issuedLocked} onClick={() => void saveLine(false)}>
            {t("en", "admin.saveDraft")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={busy || issuedLocked || Boolean(issueBlockedReason && assumedAttendance && !attendanceConfirmed)}
            title={issueBlockedReason}
            onClick={() => void saveLine(true)}
          >
            {t("en", "admin.saveApprove")}
          </Button>
          <Button
            type="button"
            disabled={busy || Boolean(issueBlockedReason)}
            title={issueBlockedReason || undefined}
            onClick={() => setIssueOpen(true)}
          >
            {t("en", "admin.issuePayslip")}
          </Button>
        </div>
        {issueBlockedReason ? <AlertBanner tone="danger">{issueBlockedReason}</AlertBanner> : null}
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

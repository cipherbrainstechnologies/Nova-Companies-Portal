"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";
import { AlertBanner } from "@/components/industrial";
import { MonthYearPicker } from "@/components/month-year-picker";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

export function StatementUploadForm({ companyId }: { companyId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const now = new Date();
  const [file, setFile] = useState<File | null>(null);
  const [useHintPeriod, setUseHintPeriod] = useState(false);
  const [salaryYear, setSalaryYear] = useState(String(now.getFullYear()));
  const [salaryMonth, setSalaryMonth] = useState(String(now.getMonth() + 1));
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<"idle" | "uploading" | "done">("idle");
  const [dragOver, setDragOver] = useState(false);

  const yearValue = Number(salaryYear);
  const monthValue = Number(salaryMonth);
  const hintValid =
    !useHintPeriod ||
    (Number.isInteger(yearValue) &&
      yearValue >= 2000 &&
      yearValue <= 2999 &&
      Number.isInteger(monthValue) &&
      monthValue >= 1 &&
      monthValue <= 12);
  const canUpload = !!file && hintValid && progress !== "uploading";

  function acceptFile(f: File | null | undefined) {
    if (!f) return;
    const ok = /\.(pdf|csv|xlsx|xls)$/i.test(f.name);
    if (!ok) {
      setError("Only PDF, CSV, or Excel files are accepted.");
      setFile(null);
      return;
    }
    setError("");
    setFile(f);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    if (!hintValid) {
      setError("Optional fallback period is invalid.");
      return;
    }
    setError("");
    setProgress("uploading");
    const body = new FormData();
    body.set("companyId", companyId);
    body.set("file", file);
    if (useHintPeriod) {
      body.set("salaryYear", String(yearValue));
      body.set("salaryMonth", String(monthValue));
    }
    const res = await fetch("/api/statements", { method: "POST", body });
    const data = await res.json();
    if (!res.ok) {
      setProgress("idle");
      setError(data.error ?? t("en", "common.failed"));
      return;
    }
    if (data.duplicate) {
      setProgress("idle");
      setError("This exact file was already uploaded for this company (checksum match).");
      return;
    }
    setProgress("done");
    setFile(null);
    router.refresh();
    setTimeout(() => setProgress("idle"), 1500);
  }

  return (
    <Card>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="rounded-[var(--nova-radius-sm)] border border-[var(--nova-border)] bg-[var(--nova-surface-muted)] p-3 text-sm text-[var(--nova-text-secondary)]">
          <p className="font-semibold text-[var(--nova-ink)]">Multi-month statements supported</p>
          <p className="mt-1">
            Each debit is filed to the salary month of its bank date. Overlapping uploads are
            deduplicated (same date, amount, and narration) so repeats are ignored and payroll is
            calculated per month.
          </p>
        </div>

        <label className="flex items-start gap-2 text-sm text-[var(--nova-text-secondary)]">
          <input
            type="checkbox"
            className="mt-1"
            checked={useHintPeriod}
            onChange={(e) => setUseHintPeriod(e.target.checked)}
          />
          <span>
            Set an optional fallback salary period (only used when a row has no usable transaction
            date)
          </span>
        </label>

        {useHintPeriod ? (
          <MonthYearPicker
            year={salaryYear}
            month={salaryMonth}
            onYearChange={setSalaryYear}
            onMonthChange={setSalaryMonth}
            yearLabel="Fallback year"
            monthLabel="Fallback month"
            idPrefix="statement-hint"
          />
        ) : null}

        <div
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center rounded-[var(--nova-radius)] border-2 border-dashed px-4 py-10 text-center transition-colors",
            dragOver
              ? "border-[var(--nova-teal)] bg-[var(--nova-teal-soft)]"
              : "border-[var(--nova-border-strong)] bg-[var(--nova-canvas)] hover:border-[var(--nova-teal)]",
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            acceptFile(e.dataTransfer.files?.[0]);
          }}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.csv,.xlsx,.xls,application/pdf,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(e) => acceptFile(e.target.files?.[0])}
          />
          <p className="text-sm font-semibold text-[var(--nova-ink)]">
            {file ? file.name : "Drag and drop your statement here"}
          </p>
          <p className="mt-1 text-xs text-[var(--nova-muted)]">
            PDF, CSV, or Excel · click to browse · one or many salary months
          </p>
        </div>

        {error ? <AlertBanner tone="danger">{error}</AlertBanner> : null}

        <div className="flex justify-end">
          <Button type="submit" disabled={!canUpload}>
            {progress === "uploading"
              ? t("en", "common.loading")
              : progress === "done"
                ? "Uploaded"
                : t("en", "admin.uploadStatement")}
          </Button>
        </div>
      </form>
    </Card>
  );
}

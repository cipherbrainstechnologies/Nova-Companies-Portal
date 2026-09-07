"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label, Select } from "@/components/ui";
import { AlertBanner } from "@/components/industrial";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function StatementUploadForm({ companyId }: { companyId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const now = new Date();
  const [file, setFile] = useState<File | null>(null);
  const [salaryYear, setSalaryYear] = useState(String(now.getFullYear()));
  const [salaryMonth, setSalaryMonth] = useState(String(now.getMonth() + 1));
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<"idle" | "uploading" | "done">("idle");
  const [dragOver, setDragOver] = useState(false);

  const yearValue = Number(salaryYear);
  const monthValue = Number(salaryMonth);
  const periodValid =
    Number.isInteger(yearValue) &&
    yearValue >= 2000 &&
    yearValue <= 2999 &&
    Number.isInteger(monthValue) &&
    monthValue >= 1 &&
    monthValue <= 12;
  const canUpload = !!file && periodValid && progress !== "uploading";

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
    if (!periodValid) {
      setError("Select the salary year and month this statement covers before uploading.");
      return;
    }
    setError("");
    setProgress("uploading");
    const body = new FormData();
    body.set("companyId", companyId);
    body.set("file", file);
    body.set("salaryYear", String(yearValue));
    body.set("salaryMonth", String(monthValue));
    const res = await fetch("/api/statements", { method: "POST", body });
    const data = await res.json();
    if (!res.ok) {
      setProgress("idle");
      setError(data.error ?? t("en", "common.failed"));
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
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="salaryYear">Salary year</Label>
            <Input
              id="salaryYear"
              inputMode="numeric"
              value={salaryYear}
              onChange={(e) => setSalaryYear(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="salaryMonth">Salary month</Label>
            <Select
              id="salaryMonth"
              value={salaryMonth}
              onChange={(e) => setSalaryMonth(e.target.value)}
              required
            >
              {MONTHS.map((name, index) => (
                <option key={name} value={index + 1}>
                  {name}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <p className="text-xs text-[var(--nova-muted)]">
          The salary period is required. Reconciliation matches debits to that payroll month and
          blocks a second payslip for an employee in the same month.
        </p>

        <Label>{t("en", "admin.statementFile")}</Label>
        <div
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center rounded-[var(--nova-radius)] border-2 border-dashed px-4 py-10 text-center transition",
            dragOver
              ? "border-[var(--nova-teal)] bg-[var(--nova-teal-soft)]"
              : "border-[var(--nova-border-strong)] bg-[var(--nova-surface-muted)] hover:border-[var(--nova-teal)]",
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
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
          }}
        >
          <p className="text-sm font-semibold text-[var(--nova-ink)]">
            Drag and drop your statement here
          </p>
          <p className="mt-1 text-xs text-[var(--nova-muted)]">PDF, CSV, XLSX · click to browse</p>
          {file ? (
            <p className="mt-3 text-sm font-medium text-[var(--nova-teal)]">{file.name}</p>
          ) : null}
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => acceptFile(e.target.files?.[0])}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={!canUpload}>
            {progress === "uploading"
              ? "Uploading…"
              : progress === "done"
                ? "Uploaded"
                : t("en", "admin.uploadStatement")}
          </Button>
          {progress === "uploading" ? (
            <div className="h-2 w-40 overflow-hidden rounded-full bg-[var(--nova-surface-muted)]">
              <div className="h-full w-2/3 animate-pulse rounded-full bg-[var(--nova-teal)]" />
            </div>
          ) : null}
        </div>
        {error ? <AlertBanner tone="danger">{error}</AlertBanner> : null}
      </form>
    </Card>
  );
}

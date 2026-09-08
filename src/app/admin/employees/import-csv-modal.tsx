"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Modal } from "@/components/modal";
import { Button, Input, Select } from "@/components/ui";
import { AlertBanner, StatusBadge } from "@/components/industrial";

type PreviewRow = {
  rowNumber: number;
  displayName: string;
  companyNameText: string;
  designationText: string;
  data: {
    displayName: string;
    designation?: string;
    companyName: string;
    companyId: string;
    monthlyGross: number;
    expectedMonthlyNet: number;
  } | null;
  errors: string[];
  warnings: string[];
};

type Decision = {
  rowNumber: number;
  action: "create" | "update" | "skip";
  employeeId?: string;
};

type Summary = {
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
};

export function ImportCsvModal({
  companyId,
  employees,
}: {
  companyId: string;
  employees: Array<{ id: string; name: string; employeeCode: string }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [batchId, setBatchId] = useState("");
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function reset() {
    setFile(null);
    setBatchId("");
    setRows([]);
    setDecisions([]);
    setEffectiveFrom("");
    setSummary(null);
    setError("");
  }

  function close() {
    setOpen(false);
    reset();
  }

  async function preview() {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.set("companyId", companyId);
      form.set("file", file);
      const response = await fetch("/api/employees/import/preview", { method: "POST", body: form });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Preview failed");
      setBatchId(body.batchId);
      setRows(body.rows);
      setDecisions(
        body.rows.map((row: PreviewRow) => ({
          rowNumber: row.rowNumber,
          action: row.errors.length ? "skip" : "create",
        })),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Preview failed");
    } finally {
      setBusy(false);
    }
  }

  function updateDecision(rowNumber: number, patch: Partial<Decision>) {
    setDecisions((current) =>
      current.map((decision) =>
        decision.rowNumber === rowNumber ? { ...decision, ...patch } : decision,
      ),
    );
  }

  async function confirm() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/employees/import/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId,
          decisions,
          effectiveFrom: effectiveFrom || undefined,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Import failed");
      setSummary({
        createdCount: body.createdCount,
        updatedCount: body.updatedCount,
        skippedCount: body.skippedCount,
        errorCount: body.errorCount,
      });
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <Upload className="h-4 w-4" />
        Import CSV
      </Button>
      <Modal
        open={open}
        onClose={close}
        title="Import employees from CSV"
        description="Download the template, upload completed rows, review each decision, then confirm."
        wide
      >
        {error ? <AlertBanner tone="danger">{error}</AlertBanner> : null}

        {summary ? (
          <div className="space-y-4">
            <AlertBanner tone={summary.errorCount ? "warning" : "success"}>
              Import finished.
            </AlertBanner>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Object.entries(summary).map(([key, value]) => (
                <div key={key} className="rounded-lg bg-[var(--nova-surface-muted)] p-3">
                  <div className="text-xs text-[var(--nova-muted)]">{key.replace("Count", "")}</div>
                  <div className="mt-1 text-xl font-bold">{value}</div>
                </div>
              ))}
            </div>
            <Button type="button" onClick={close}>Done</Button>
          </div>
        ) : rows.length ? (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-lg border border-[var(--nova-border)]">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[var(--nova-surface-muted)] text-xs uppercase text-[var(--nova-muted)]">
                  <tr>
                    <th className="px-3 py-2">Row</th>
                    <th className="px-3 py-2">Employee</th>
                    <th className="px-3 py-2">Salary</th>
                    <th className="px-3 py-2">Validation</th>
                    <th className="px-3 py-2">Decision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--nova-border)]">
                  {rows.map((row) => {
                    const decision = decisions.find((item) => item.rowNumber === row.rowNumber);
                    return (
                      <tr key={row.rowNumber}>
                        <td className="px-3 py-3">{row.rowNumber}</td>
                        <td className="px-3 py-3">
                          <div className="font-semibold">
                            {row.data?.displayName ?? row.displayName ?? "—"}
                          </div>
                          <div className="text-xs text-[var(--nova-muted)]">
                            {row.data?.designation ?? row.designationText ?? "—"} ·{" "}
                            {row.data?.companyName ?? row.companyNameText ?? "—"}
                          </div>
                        </td>
                        <td className="px-3 py-3 tabular-nums">
                          {row.data
                            ? `₹${row.data.monthlyGross.toLocaleString("en-IN")} / ₹${row.data.expectedMonthlyNet.toLocaleString("en-IN")} net`
                            : "—"}
                        </td>
                        <td className="max-w-xs px-3 py-3">
                          {row.errors.map((message) => (
                            <div key={message} className="text-xs text-[var(--nova-danger)]">{message}</div>
                          ))}
                          {row.warnings.map((message) => (
                            <div key={message} className="text-xs text-[var(--nova-warning)]">{message}</div>
                          ))}
                          {!row.errors.length && !row.warnings.length ? (
                            <StatusBadge status="Valid" tone="success" />
                          ) : null}
                        </td>
                        <td className="min-w-48 px-3 py-3">
                          <Select
                            value={decision?.action ?? "skip"}
                            disabled={row.errors.length > 0}
                            onChange={(event) =>
                              updateDecision(row.rowNumber, {
                                action: event.target.value as Decision["action"],
                                employeeId: undefined,
                              })
                            }
                          >
                            <option value="create">Create</option>
                            <option value="update">Update existing</option>
                            <option value="skip">Skip</option>
                          </Select>
                          {decision?.action === "update" ? (
                            <Select
                              className="mt-2"
                              value={decision.employeeId ?? ""}
                              onChange={(event) =>
                                updateDecision(row.rowNumber, { employeeId: event.target.value })
                              }
                            >
                              <option value="">Select employee</option>
                              {employees.map((employee) => (
                                <option key={employee.id} value={employee.id}>
                                  {employee.employeeCode} · {employee.name}
                                </option>
                              ))}
                            </Select>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="grid gap-2 sm:max-w-xs">
              <label className="text-xs font-semibold text-[var(--nova-muted)]" htmlFor="import-effective-from">
                Salary effective from (optional)
              </label>
              <Input
                id="import-effective-from"
                type="date"
                value={effectiveFrom}
                onChange={(event) => setEffectiveFrom(event.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" onClick={confirm} disabled={busy}>
                {busy ? "Importing…" : "Confirm import"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => { setRows([]); setBatchId(""); }}>
                Choose another file
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <a
              href={`/api/employees/import/template?companyId=${encodeURIComponent(companyId)}`}
              className="inline-flex min-h-11 items-center rounded-[var(--nova-radius-sm)] border border-[var(--nova-border-strong)] px-4 text-sm font-semibold text-[var(--nova-teal)] hover:border-[var(--nova-teal)]"
              download
            >
              Download CSV template
            </a>
            <div>
              <label htmlFor="employee-import-file" className="mb-1.5 block text-xs font-semibold text-[var(--nova-muted)]">
                Completed CSV
              </label>
              <Input
                id="employee-import-file"
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </div>
            <Button type="button" onClick={preview} disabled={!file || busy}>
              {busy ? "Reading CSV…" : "Preview rows"}
            </Button>
          </div>
        )}
      </Modal>
    </>
  );
}

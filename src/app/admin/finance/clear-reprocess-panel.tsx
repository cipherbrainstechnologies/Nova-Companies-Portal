"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Button, Card, Label, Select } from "@/components/ui";
import { AlertBanner, BracketLabel, Meta } from "@/components/industrial";

export function FinanceClearReprocessPanel({
  companies,
}: {
  companies: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [companyId, setCompanyId] = useState("ALL");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cleared, setCleared] = useState(false);

  async function run(action: "clear" | "reprocess" | "recompute") {
    if (action === "clear") {
      const ok = window.confirm(
        [
          "Clear Finance Calculations?",
          "",
          "This will remove:",
          "• Generated finance snapshots",
          "• Cached dashboard totals",
          "• Generated monthly summaries",
          "• Derived growth calculations",
          "• Automatic classification results that will be rebuilt",
          "",
          "This will PRESERVE:",
          "• Original uploaded statements",
          "• Canonical bank transactions",
          "• Manual classifications and allocation notes",
          "• Company settings and classification rules",
          "• Employees and salary structures",
          "• Payroll runs and issued payslips",
          "• Audit history",
          "",
          "Historical payslips will NOT be regenerated or emailed.",
        ].join("\n"),
      );
      if (!ok) return;
    }

    setBusy(action);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/finance/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          companyId: companyId === "ALL" ? undefined : companyId,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Request failed");
      if (action === "clear") {
        setCleared(true);
        setMessage(json.message);
      } else if (action === "reprocess") {
        setMessage(
          `Reprocessed ${json.results?.length ?? 0} statement(s); ${json.results?.filter((r: { ok: boolean }) => r.ok).length ?? 0} succeeded.`,
        );
        setCleared(false);
      } else {
        setMessage(`Recomputed ${json.months ?? 0} month(s).`);
        setCleared(false);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="space-y-4 p-4">
      <BracketLabel>Clear / rebuild finance ledger</BracketLabel>
      <p className="text-sm text-[var(--nova-muted)]">
        Super Admin only. Clears derived calculations without touching statements, employees, or
        payslips.
      </p>
      <div className="max-w-sm">
        <Label>Company scope</Label>
        <Select value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
          <option value="ALL">All companies</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="danger"
          disabled={!!busy}
          onClick={() => void run("clear")}
        >
          {busy === "clear" ? "Clearing…" : "Clear Finance Calculations"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!!busy}
          onClick={() => void run("reprocess")}
        >
          {busy === "reprocess" ? "Reprocessing…" : "Reprocess Existing Statements"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!!busy}
          onClick={() => void run("recompute")}
        >
          {busy === "recompute" ? "Recomputing…" : "Recompute Ledger Snapshots"}
        </Button>
        <Link
          href="/admin/statements"
          className="inline-flex min-h-11 items-center rounded-[var(--nova-radius-sm)] border border-[var(--nova-border-strong)] px-4 text-sm font-semibold text-[var(--nova-teal)]"
        >
          Upload Statements
        </Link>
      </div>
      {cleared ? (
        <AlertBanner tone="info">
          Finance calculations cleared. Reprocess existing statements or upload statements to rebuild
          the ledger.
        </AlertBanner>
      ) : null}
      {message ? <Meta>{message}</Meta> : null}
      {error ? <AlertBanner tone="danger">{error}</AlertBanner> : null}
    </Card>
  );
}

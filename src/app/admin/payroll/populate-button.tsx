"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { AlertBanner } from "@/components/industrial";

type Diagnostics = {
  employeesFound: number;
  eligibleEmployees: number;
  linesCreated: number;
  salaryReviewRequired: number;
  paymentsMatched: number;
  paymentsUnmatched: number;
  reason: string;
  nextAction: string;
};

export function PopulatePayrollLinesButton({
  runId,
  lineCount,
}: {
  runId: string;
  lineCount: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);

  async function populate() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/payroll/runs/${runId}/populate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Populate failed");
      setDiagnostics(body.diagnostics);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Populate failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" disabled={busy} onClick={() => void populate()}>
        {busy ? "Populating…" : lineCount === 0 ? "Populate Employee Lines" : "Refresh Employee Lines"}
      </Button>
      {error ? <AlertBanner tone="danger">{error}</AlertBanner> : null}
      {diagnostics ? (
        <AlertBanner tone={diagnostics.reason === "ok" ? "success" : "warning"}>
          <div className="space-y-1 text-sm">
            <div>{diagnostics.nextAction}</div>
            <div className="text-xs opacity-90">
              Employees found {diagnostics.employeesFound} · Eligible {diagnostics.eligibleEmployees} ·
              Lines created {diagnostics.linesCreated} · Salary review {diagnostics.salaryReviewRequired} ·
              Payments matched {diagnostics.paymentsMatched} · Unmatched {diagnostics.paymentsUnmatched}
            </div>
          </div>
        </AlertBanner>
      ) : null}
    </div>
  );
}

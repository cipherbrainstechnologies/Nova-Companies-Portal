"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { AlertBanner } from "@/components/industrial";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { t } from "@/i18n";

/**
 * Issues only the payroll lines that are both approved and reconciled. Unresolved partial
 * payments and amount mismatches are excluded server-side as well.
 */
export function IssueApprovedButton({
  runId,
  companyId,
  month,
  year,
  count,
  blockedCount,
}: {
  runId: string;
  companyId: string;
  month: number;
  year: number;
  count: number;
  blockedCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function issue() {
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const res = await fetch(`/api/payroll/runs/${runId}/issue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          approvedOnly: true,
          lineIds: [],
          confirmation: { count, month, companyId },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.expectedCount != null
            ? `${data.error}. Refresh and confirm ${data.expectedCount} payslip(s).`
            : (data.error ?? t("en", "common.failed")),
        );
      }
      setMessage(t("en", "admin.issueQueued"));
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("en", "common.failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button type="button" disabled={!count || busy} onClick={() => setOpen(true)}>
        Issue Approved Payslips Only ({count})
      </Button>
      {blockedCount ? (
        <p className="text-xs text-[var(--nova-warning)]">
          {blockedCount} line(s) held back for reconciliation review and excluded from this action.
        </p>
      ) : null}
      {error ? <AlertBanner tone="danger">{error}</AlertBanner> : null}
      {message ? <AlertBanner tone="success">{message}</AlertBanner> : null}

      <ConfirmDialog
        open={open}
        title="Issue approved payslips"
        description={`Issue ${count} payslip(s) for ${String(month).padStart(2, "0")}/${year}. Only approved and reconciled lines are included; partial payments and amount mismatches are excluded.`}
        confirmLabel="Issue approved payslips"
        busy={busy}
        onCancel={() => setOpen(false)}
        onConfirm={() => void issue()}
      />
    </div>
  );
}

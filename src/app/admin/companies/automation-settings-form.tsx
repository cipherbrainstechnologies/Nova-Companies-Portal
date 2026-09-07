"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label, Select } from "@/components/ui";
import { AlertBanner, BracketLabel } from "@/components/industrial";
import { t } from "@/i18n";

export function AutomationSettingsForm({
  companyId,
  autoIssueExactMatches,
  emailDeliveryPreference,
  matchScoreThreshold,
}: {
  companyId: string;
  autoIssueExactMatches: boolean;
  emailDeliveryPreference: string;
  matchScoreThreshold: number;
}) {
  const router = useRouter();
  const [autoIssue, setAutoIssue] = useState(autoIssueExactMatches);
  const [preference, setPreference] = useState(emailDeliveryPreference);
  const [threshold, setThreshold] = useState(String(matchScoreThreshold));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const res = await fetch(`/api/companies/${companyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          autoIssueExactMatches: autoIssue,
          emailDeliveryPreference: preference,
          matchScoreThreshold: Number(threshold),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("en", "common.failed"));
      setMessage("Automation settings saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("en", "common.failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <form onSubmit={save} className="space-y-4">
        <BracketLabel>Payroll automation</BracketLabel>

        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={autoIssue}
            onChange={(e) => setAutoIssue(e.target.checked)}
            className="mt-1 h-4 w-4 accent-[var(--nova-teal)]"
          />
          <span>
            <span className="font-semibold text-[var(--nova-ink)]">
              Auto-issue exact matches
            </span>
            <span className="mt-0.5 block text-xs text-[var(--nova-muted)]">
              Only payments equal to the expected monthly net qualify. Partial payments and
              amount mismatches always wait for a human decision.
            </span>
          </span>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="emailDeliveryPreference">Payslip email delivery</Label>
            <Select
              id="emailDeliveryPreference"
              value={preference}
              onChange={(e) => setPreference(e.target.value)}
            >
              <option value="OFFICIAL_PREFERRED">Official email preferred</option>
              <option value="PERSONAL_PREFERRED">Personal email preferred</option>
              <option value="BOTH">Send to both</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="matchScoreThreshold">Match score threshold</Label>
            <Input
              id="matchScoreThreshold"
              inputMode="numeric"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
            />
            <p className="mt-1 text-xs text-[var(--nova-muted)]">
              Minimum confidence (0–100) before a bank narration is treated as a match.
            </p>
          </div>
        </div>

        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save automation settings"}
        </Button>
        {error ? <AlertBanner tone="danger">{error}</AlertBanner> : null}
        {message ? <AlertBanner tone="success">{message}</AlertBanner> : null}
      </form>
    </Card>
  );
}

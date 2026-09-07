"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label } from "@/components/ui";
import { AlertBanner, BracketLabel, MoneyValue, StatusBadge } from "@/components/industrial";
import { deriveExpectedMonthlyNet, monthlyGrossFromAnnualCtc } from "@/server/payroll/salary-structure";
import { t } from "@/i18n";

type ComponentRow = { code: string; label: string; amount: string };

export type SalaryStructureFormValues = {
  annualCtc?: number | null;
  monthlyGross?: number | null;
  monthlyTds?: number | null;
  monthlyPt?: number | null;
  expectedMonthlyNet?: number | null;
  effectiveFrom?: string | null;
  components?: Record<string, number> | null;
  paymentAliases?: string[];
  accountHolderName?: string | null;
  notes?: string | null;
};

function toInput(value: number | null | undefined): string {
  return value == null ? "" : String(value);
}

function toNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed.replace(/[₹,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function componentRows(components: Record<string, number> | null | undefined): ComponentRow[] {
  const entries = Object.entries(components ?? {});
  if (!entries.length) {
    return [{ code: "BASIC", label: "Consolidated/Basic", amount: "" }];
  }
  return entries.map(([code, amount]) => ({ code, label: code, amount: String(amount) }));
}

export function SalaryStructureForm({
  companyId,
  employeeId,
  initial,
}: {
  companyId: string;
  employeeId: string;
  initial?: SalaryStructureFormValues;
}) {
  const router = useRouter();
  const [annualCtc, setAnnualCtc] = useState(toInput(initial?.annualCtc));
  const [monthlyGross, setMonthlyGross] = useState(toInput(initial?.monthlyGross));
  const [monthlyTds, setMonthlyTds] = useState(toInput(initial?.monthlyTds));
  const [monthlyPt, setMonthlyPt] = useState(toInput(initial?.monthlyPt));
  const [expectedNetOverride, setExpectedNetOverride] = useState(
    toInput(initial?.expectedMonthlyNet),
  );
  const [effectiveFrom, setEffectiveFrom] = useState(
    initial?.effectiveFrom?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
  );
  const [accountHolderName, setAccountHolderName] = useState(initial?.accountHolderName ?? "");
  const [aliasText, setAliasText] = useState((initial?.paymentAliases ?? []).join("\n"));
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [components, setComponents] = useState<ComponentRow[]>(componentRows(initial?.components));
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const derivedGross = useMemo(
    () => toNumber(monthlyGross) ?? monthlyGrossFromAnnualCtc(toNumber(annualCtc)),
    [monthlyGross, annualCtc],
  );

  const expectedNet = useMemo(
    () =>
      deriveExpectedMonthlyNet({
        annualCtc: toNumber(annualCtc),
        monthlyGross: toNumber(monthlyGross),
        monthlyTds: toNumber(monthlyTds),
        monthlyPt: toNumber(monthlyPt),
        expectedMonthlyNet: toNumber(expectedNetOverride),
      }),
    [annualCtc, monthlyGross, monthlyTds, monthlyPt, expectedNetOverride],
  );

  const componentTotal = useMemo(
    () => components.reduce((total, row) => total + (toNumber(row.amount) ?? 0), 0),
    [components],
  );

  const componentsMismatch =
    componentTotal > 0 && derivedGross != null && Math.abs(componentTotal - derivedGross) > 1;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const componentMap: Record<string, number> = {};
      for (const row of components) {
        const code = row.code.trim().toUpperCase();
        const amount = toNumber(row.amount);
        if (!code || amount == null) continue;
        componentMap[code] = amount;
      }

      const res = await fetch(`/api/employees/${employeeId}/salary-structure`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          annualCtc: toNumber(annualCtc),
          monthlyGross: toNumber(monthlyGross),
          monthlyTds: toNumber(monthlyTds),
          monthlyPt: toNumber(monthlyPt),
          expectedMonthlyNet: toNumber(expectedNetOverride),
          effectiveFrom,
          components: componentMap,
          paymentAliases: aliasText
            .split(/[\n,]/)
            .map((alias) => alias.trim())
            .filter(Boolean),
          accountHolderName: accountHolderName.trim() || null,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("en", "common.failed"));
      setMessage("Salary structure saved. A new version was recorded.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("en", "common.failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <BracketLabel>Salary structure</BracketLabel>
          <StatusBadge
            status={expectedNet != null ? "Ready for auto reconciliation" : "Structure incomplete"}
            tone={expectedNet != null ? "success" : "warning"}
          />
        </div>

        <AlertBanner tone="info">
          The expected monthly net is what reconciliation compares each bank debit against. An
          exact match is auto-reconciled; anything higher or lower is held for review and never
          issues a payslip on its own.
        </AlertBanner>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <Label htmlFor="annualCtc">Annual CTC</Label>
            <Input
              id="annualCtc"
              inputMode="decimal"
              value={annualCtc}
              onChange={(e) => setAnnualCtc(e.target.value)}
              placeholder="e.g. 600000"
            />
          </div>
          <div>
            <Label htmlFor="monthlyGross">Monthly gross</Label>
            <Input
              id="monthlyGross"
              inputMode="decimal"
              value={monthlyGross}
              onChange={(e) => setMonthlyGross(e.target.value)}
              placeholder={
                monthlyGrossFromAnnualCtc(toNumber(annualCtc))?.toString() ?? "e.g. 50000"
              }
            />
          </div>
          <div>
            <Label htmlFor="monthlyTds">Monthly TDS</Label>
            <Input
              id="monthlyTds"
              inputMode="decimal"
              value={monthlyTds}
              onChange={(e) => setMonthlyTds(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="monthlyPt">Monthly professional tax</Label>
            <Input
              id="monthlyPt"
              inputMode="decimal"
              value={monthlyPt}
              onChange={(e) => setMonthlyPt(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="expectedNet">Expected monthly net (override)</Label>
            <Input
              id="expectedNet"
              inputMode="decimal"
              value={expectedNetOverride}
              onChange={(e) => setExpectedNetOverride(e.target.value)}
              placeholder={expectedNet != null ? String(expectedNet) : "gross − TDS − PT"}
            />
          </div>
          <div>
            <Label htmlFor="effectiveFrom">Effective from</Label>
            <Input
              id="effectiveFrom"
              type="date"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
            />
          </div>
        </div>

        <div className="rounded-[var(--nova-radius-sm)] bg-[var(--nova-surface-muted)] px-4 py-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <span className="text-[var(--nova-text-secondary)]">
              Derived gross{" "}
              {derivedGross != null ? <MoneyValue value={derivedGross} /> : <span>—</span>}
            </span>
            <span className="text-[var(--nova-text-secondary)]">
              Expected net{" "}
              {expectedNet != null ? <MoneyValue value={expectedNet} /> : <span>—</span>}
            </span>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-[var(--nova-ink)]">Component breakdown</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setComponents((rows) => [...rows, { code: "", label: "", amount: "" }])}
            >
              {t("en", "admin.addRow")}
            </Button>
          </div>
          <div className="space-y-2">
            {components.map((row, idx) => (
              <div key={idx} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <Input
                  aria-label="Component code"
                  placeholder={t("en", "admin.code")}
                  value={row.code}
                  onChange={(e) =>
                    setComponents((rows) =>
                      rows.map((r, i) => (i === idx ? { ...r, code: e.target.value } : r)),
                    )
                  }
                />
                <Input
                  aria-label="Component amount"
                  inputMode="decimal"
                  placeholder={t("en", "admin.amount")}
                  value={row.amount}
                  onChange={(e) =>
                    setComponents((rows) =>
                      rows.map((r, i) => (i === idx ? { ...r, amount: e.target.value } : r)),
                    )
                  }
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setComponents((rows) => rows.filter((_, i) => i !== idx))}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
          {componentsMismatch ? (
            <p className="mt-2 text-xs text-[var(--nova-warning)]">
              Components total {componentTotal.toLocaleString("en-IN")} but monthly gross is{" "}
              {derivedGross?.toLocaleString("en-IN")}. Payslips use the components; reconciliation
              uses the expected net.
            </p>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="accountHolderName">Bank account holder name</Label>
            <Input
              id="accountHolderName"
              value={accountHolderName}
              onChange={(e) => setAccountHolderName(e.target.value)}
              placeholder="As printed on the bank statement"
            />
          </div>
          <div>
            <Label htmlFor="paymentAliases">Payment aliases (one per line)</Label>
            <textarea
              id="paymentAliases"
              rows={3}
              value={aliasText}
              onChange={(e) => setAliasText(e.target.value)}
              placeholder={"J A JOHN\nJEENA A JOHN"}
              className="w-full rounded-[var(--nova-radius-sm)] border border-[var(--nova-border-strong)] bg-[var(--nova-surface)] px-3 py-2.5 text-sm text-[var(--nova-text)] placeholder:text-[var(--nova-muted)] focus-visible:border-[var(--nova-teal)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--nova-teal)]/30"
            />
            <p className="mt-1 text-xs text-[var(--nova-muted)]">
              Narration spellings the bank uses for this employee. Aliases raise match confidence.
            </p>
          </div>
        </div>

        <div>
          <Label htmlFor="structureNotes">Notes</Label>
          <Input id="structureNotes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save salary structure"}
          </Button>
          <span className="text-xs text-[var(--nova-muted)]">
            Saving creates a new version; earlier versions stay available for issued payslips.
          </span>
        </div>

        {error ? <AlertBanner tone="danger">{error}</AlertBanner> : null}
        {message ? <AlertBanner tone="success">{message}</AlertBanner> : null}
      </form>
    </Card>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label } from "@/components/ui";
import { AlertBanner, BracketLabel, MoneyValue, StatusBadge } from "@/components/industrial";
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

type TaxBreakdown = {
  projectedAnnualGross: number;
  standardDeduction: number;
  otherDeductions: number;
  taxableIncome: number;
  taxBySlab: Array<{
    from: number;
    to: number | null;
    rate: number;
    taxableInSlab: number;
    tax: number;
  }>;
  taxBeforeRebate: number;
  rebate: number;
  marginalReliefRebate: number;
  surcharge: number;
  marginalReliefSurcharge: number;
  cess: number;
  annualTax: number;
  assumptions: string[];
  unsupportedNotes: string[];
  sourceUrl: string;
};

type Calculation = {
  financialYear: string;
  assessmentYear: string;
  regime: "NEW" | "OLD";
  residentialStatus: "RESIDENT" | "NON_RESIDENT";
  annualCtc: number;
  nonCashCtcComponents: number;
  annualGrossCash: number;
  monthlyGross: number;
  monthlyGrossUnrounded: number;
  monthlyRoundingDifference: number;
  indicativeMonthlyTds: number;
  monthlyProfessionalTax: number;
  otherMonthlyDeductions: number;
  expectedMonthlyNetCalculated: number;
  expectedMonthlyNet: number;
  monthlyTds: number;
  tax: TaxBreakdown;
  remainingPayrollPeriods: number;
  remainingTdsToCollect: number;
  periodSpecificMonthlyTds: number;
  excessTdsReviewRequired: boolean;
  excessTdsAmount: number;
  comparison?: {
    preservedMonthlyTds: number | null;
    preservedExpectedNet: number | null;
    tdsDelta: number | null;
    netDelta: number | null;
  };
  assumptionBanner: string;
  disclaimer: string;
  ruleSourceUrl: string;
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

function buildComponentMap(rows: ComponentRow[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const row of rows) {
    const code = row.code.trim().toUpperCase();
    const amount = toNumber(row.amount);
    if (!code || amount == null) continue;
    map[code] = amount;
  }
  return map;
}

export function SalaryStructureForm({
  companyId,
  employeeId,
  initial,
  defaultMonthlyProfessionalTax = 200,
}: {
  companyId: string;
  employeeId: string;
  initial?: SalaryStructureFormValues;
  defaultMonthlyProfessionalTax?: number;
}) {
  const router = useRouter();
  const hadImportedValues = Boolean(
    initial?.monthlyTds != null || initial?.expectedMonthlyNet != null || initial?.monthlyGross != null,
  );

  const [annualCtc, setAnnualCtc] = useState(toInput(initial?.annualCtc));
  const [monthlyGross, setMonthlyGross] = useState(toInput(initial?.monthlyGross));
  const [monthlyTds, setMonthlyTds] = useState(toInput(initial?.monthlyTds));
  const [monthlyPt, setMonthlyPt] = useState(
    toInput(initial?.monthlyPt ?? defaultMonthlyProfessionalTax),
  );
  const [expectedNetDisplay, setExpectedNetDisplay] = useState(toInput(initial?.expectedMonthlyNet));
  const [effectiveFrom, setEffectiveFrom] = useState(
    initial?.effectiveFrom?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
  );
  const [financialYear, setFinancialYear] = useState("2025-26");
  const [regime, setRegime] = useState<"NEW" | "OLD">("NEW");
  const [residentialStatus, setResidentialStatus] = useState<"RESIDENT" | "NON_RESIDENT">(
    "RESIDENT",
  );
  const [accountHolderName, setAccountHolderName] = useState(initial?.accountHolderName ?? "");
  const [aliasText, setAliasText] = useState((initial?.paymentAliases ?? []).join("\n"));
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [components, setComponents] = useState<ComponentRow[]>(componentRows(initial?.components));
  const [applyAutomatic, setApplyAutomatic] = useState(!hadImportedValues);
  const [overrideExpectedNet, setOverrideExpectedNet] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideNetValue, setOverrideNetValue] = useState("");
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [calculation, setCalculation] = useState<Calculation | null>(null);
  const [calcError, setCalcError] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [calcBusy, setCalcBusy] = useState(false);
  const requestSeq = useRef(0);

  const componentTotal = useMemo(
    () => components.reduce((total, row) => total + (toNumber(row.amount) ?? 0), 0),
    [components],
  );

  const displayedGross = calculation?.monthlyGross ?? toNumber(monthlyGross);
  const displayedTds = applyAutomatic
    ? (calculation?.indicativeMonthlyTds ?? toNumber(monthlyTds))
    : toNumber(monthlyTds);
  const displayedPt = calculation?.monthlyProfessionalTax ?? toNumber(monthlyPt);
  const displayedNet = applyAutomatic
    ? overrideExpectedNet
      ? toNumber(overrideNetValue)
      : (calculation?.expectedMonthlyNetCalculated ?? toNumber(expectedNetDisplay))
    : toNumber(expectedNetDisplay);

  const componentsMismatch =
    componentTotal > 0 && displayedGross != null && Math.abs(componentTotal - displayedGross) > 1;

  const importedComparison =
    hadImportedValues && calculation
      ? {
          tdsDelta:
            initial?.monthlyTds != null
              ? Math.round((initial.monthlyTds - calculation.indicativeMonthlyTds) * 100) / 100
              : null,
          netDelta:
            initial?.expectedMonthlyNet != null
              ? Math.round(
                  (initial.expectedMonthlyNet - calculation.expectedMonthlyNetCalculated) * 100,
                ) / 100
              : null,
        }
      : null;

  const runCalculate = async () => {
    const ctc = toNumber(annualCtc);
    if (ctc == null) {
      setCalculation(null);
      setCalcError("");
      return;
    }
    const seq = ++requestSeq.current;
    setCalcBusy(true);
    setCalcError("");
    try {
      const res = await fetch("/api/salary-structure/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          annualCtc: ctc,
          monthlyGross: applyAutomatic ? null : toNumber(monthlyGross),
          monthlyProfessionalTax: toNumber(monthlyPt) ?? defaultMonthlyProfessionalTax,
          components: buildComponentMap(components),
          effectiveFrom,
          financialYear,
          regime,
          residentialStatus,
          preserveMonthlyTds: applyAutomatic ? null : toNumber(monthlyTds),
          preserveExpectedNet: applyAutomatic ? null : toNumber(expectedNetDisplay),
        }),
      });
      const data = await res.json();
      if (seq !== requestSeq.current) return;
      if (!res.ok) throw new Error(data.error ?? "Calculation failed");
      const calc = data.calculation as Calculation;
      setCalculation(calc);
      if (applyAutomatic) {
        setMonthlyGross(String(calc.monthlyGross));
        setMonthlyTds(String(calc.indicativeMonthlyTds));
        setMonthlyPt(String(calc.monthlyProfessionalTax));
        setExpectedNetDisplay(String(calc.expectedMonthlyNetCalculated));
      }
    } catch (err) {
      if (seq !== requestSeq.current) return;
      setCalculation(null);
      setCalcError(err instanceof Error ? err.message : "Calculation failed");
    } finally {
      if (seq === requestSeq.current) setCalcBusy(false);
    }
  };

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void runCalculate();
    }, 280);
    return () => window.clearTimeout(handle);
    // Recalculate when salary / tax inputs change; latest state is read from the closure above.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional debounce on these fields
  }, [
    annualCtc,
    monthlyGross,
    monthlyPt,
    monthlyTds,
    expectedNetDisplay,
    effectiveFrom,
    financialYear,
    regime,
    residentialStatus,
    components,
    applyAutomatic,
    defaultMonthlyProfessionalTax,
    companyId,
  ]);

  function applyAutomaticCalculation() {
    setApplyAutomatic(true);
    setOverrideExpectedNet(false);
    setOverrideReason("");
    setOverrideNetValue("");
    setMessage("Automatic calculation will be applied on save as a new salary-structure version.");
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const res = await fetch(`/api/employees/${employeeId}/salary-structure`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          annualCtc: toNumber(annualCtc),
          monthlyGross: toNumber(monthlyGross),
          monthlyTds: toNumber(monthlyTds),
          monthlyPt: toNumber(monthlyPt),
          expectedMonthlyNet: overrideExpectedNet
            ? toNumber(overrideNetValue)
            : toNumber(expectedNetDisplay),
          effectiveFrom,
          components: buildComponentMap(components),
          paymentAliases: aliasText
            .split(/[\n,]/)
            .map((alias) => alias.trim())
            .filter(Boolean),
          accountHolderName: accountHolderName.trim() || null,
          notes: notes.trim() || undefined,
          financialYear,
          regime,
          residentialStatus,
          applyAutomaticCalculation: applyAutomatic,
          overrideExpectedNet,
          overrideReason: overrideReason.trim() || undefined,
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
            status={
              displayedNet != null
                ? applyAutomatic
                  ? "Auto-calc ready"
                  : "Imported values preserved"
                : "Structure incomplete"
            }
            tone={displayedNet != null ? (applyAutomatic ? "success" : "warning") : "warning"}
          />
        </div>

        <AlertBanner tone="info">
          {calculation?.assumptionBanner ??
            "Simplified salary mode: Annual CTC is treated as annual gross cash salary (÷ 12 = monthly gross)."}{" "}
          Expected monthly net is what reconciliation compares each bank debit against. Server
          recalculates on save — client net is never trusted as authority.
        </AlertBanner>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label htmlFor="financialYear">Financial / tax year</Label>
            <select
              id="financialYear"
              value={financialYear}
              onChange={(e) => setFinancialYear(e.target.value)}
              className="w-full rounded-[var(--nova-radius-sm)] border border-[var(--nova-border-strong)] bg-[var(--nova-surface)] px-3 py-2.5 text-sm"
            >
              <option value="2025-26">FY 2025–26 / AY 2026–27</option>
            </select>
          </div>
          <div>
            <Label htmlFor="regime">Tax regime</Label>
            <select
              id="regime"
              value={regime}
              onChange={(e) => setRegime(e.target.value as "NEW" | "OLD")}
              className="w-full rounded-[var(--nova-radius-sm)] border border-[var(--nova-border-strong)] bg-[var(--nova-surface)] px-3 py-2.5 text-sm"
            >
              <option value="NEW">New</option>
              <option value="OLD">Old</option>
            </select>
          </div>
          <div>
            <Label htmlFor="residentialStatus">Residential status</Label>
            <select
              id="residentialStatus"
              value={residentialStatus}
              onChange={(e) =>
                setResidentialStatus(e.target.value as "RESIDENT" | "NON_RESIDENT")
              }
              className="w-full rounded-[var(--nova-radius-sm)] border border-[var(--nova-border-strong)] bg-[var(--nova-surface)] px-3 py-2.5 text-sm"
            >
              <option value="RESIDENT">Resident</option>
              <option value="NON_RESIDENT">Non-resident</option>
            </select>
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
              readOnly={applyAutomatic}
              placeholder={calculation ? String(calculation.monthlyGross) : "e.g. 50000"}
            />
          </div>
          <div>
            <Label htmlFor="monthlyTds">
              Monthly TDS {applyAutomatic ? "(indicative)" : "(preserved)"}
            </Label>
            <Input
              id="monthlyTds"
              inputMode="decimal"
              value={monthlyTds}
              onChange={(e) => setMonthlyTds(e.target.value)}
              readOnly={applyAutomatic}
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
            <p className="mt-1 text-xs text-[var(--nova-muted)]">
              Company default ₹{defaultMonthlyProfessionalTax}/month (not an income-tax rule).
            </p>
          </div>
          <div>
            <Label htmlFor="expectedNet">Expected monthly net — calculated</Label>
            <Input
              id="expectedNet"
              inputMode="decimal"
              value={
                applyAutomatic && !overrideExpectedNet
                  ? expectedNetDisplay
                  : overrideExpectedNet
                    ? overrideNetValue
                    : expectedNetDisplay
              }
              onChange={(e) => {
                if (overrideExpectedNet) setOverrideNetValue(e.target.value);
                else if (!applyAutomatic) setExpectedNetDisplay(e.target.value);
              }}
              readOnly={applyAutomatic && !overrideExpectedNet}
              placeholder="gross − TDS − PT"
            />
          </div>
        </div>

        <div className="rounded-[var(--nova-radius-sm)] bg-[var(--nova-surface-muted)] px-4 py-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <span className="text-[var(--nova-text-secondary)]">
              Monthly gross{" "}
              {displayedGross != null ? <MoneyValue value={displayedGross} /> : <span>—</span>}
            </span>
            <span className="text-[var(--nova-text-secondary)]">
              Indicative TDS{" "}
              {displayedTds != null ? <MoneyValue value={displayedTds} /> : <span>—</span>}
            </span>
            <span className="text-[var(--nova-text-secondary)]">
              Professional tax{" "}
              {displayedPt != null ? <MoneyValue value={displayedPt} /> : <span>—</span>}
            </span>
            <span className="text-[var(--nova-text-secondary)]">
              Expected net{" "}
              {displayedNet != null ? <MoneyValue value={displayedNet} /> : <span>—</span>}
              {calcBusy ? " …" : null}
            </span>
          </div>
          {calculation && Math.abs(calculation.monthlyRoundingDifference) >= 0.01 ? (
            <p className="mt-2 text-xs text-[var(--nova-muted)]">
              Annual↔monthly rounding difference allocated: ₹
              {calculation.monthlyRoundingDifference.toLocaleString("en-IN")} (annual CTC is
              preserved; monthly gross is rounded to paise).
            </p>
          ) : null}
        </div>

        {hadImportedValues && !applyAutomatic ? (
          <AlertBanner tone="warning">
            Imported TDS/net values are preserved. Calculated comparison
            {importedComparison?.tdsDelta != null
              ? `: TDS Δ ₹${importedComparison.tdsDelta.toLocaleString("en-IN")}`
              : ""}
            {importedComparison?.netDelta != null
              ? `, net Δ ₹${importedComparison.netDelta.toLocaleString("en-IN")}`
              : ""}
            . Use “Apply automatic calculation” with an effective date to create a new version —
            historical payslips are not overwritten.
            <div className="mt-3">
              <Button type="button" size="sm" variant="outline" onClick={applyAutomaticCalculation}>
                Apply automatic calculation
              </Button>
            </div>
          </AlertBanner>
        ) : null}

        {applyAutomatic ? (
          <div className="space-y-2 rounded-[var(--nova-radius-sm)] border border-[var(--nova-border)] px-4 py-3">
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={overrideExpectedNet}
                onChange={(e) => {
                  setOverrideExpectedNet(e.target.checked);
                  if (e.target.checked) {
                    setOverrideNetValue(expectedNetDisplay);
                  }
                }}
              />
              <span>
                Permission-controlled override of expected monthly net (does not change gross or
                fabricate TDS). Reason required; audited on save.
              </span>
            </label>
            {overrideExpectedNet ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="overrideNet">Overridden expected net</Label>
                  <Input
                    id="overrideNet"
                    inputMode="decimal"
                    value={overrideNetValue}
                    onChange={(e) => setOverrideNetValue(e.target.value)}
                  />
                  <p className="mt-1 text-xs text-[var(--nova-muted)]">
                    Calculated:{" "}
                    {calculation ? (
                      <MoneyValue value={calculation.expectedMonthlyNetCalculated} />
                    ) : (
                      "—"
                    )}
                  </p>
                </div>
                <div>
                  <Label htmlFor="overrideReason">Override reason</Label>
                  <Input
                    id="overrideReason"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    required={overrideExpectedNet}
                  />
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <div>
          <Button type="button" size="sm" variant="outline" onClick={() => setShowBreakdown((v) => !v)}>
            {showBreakdown ? "Hide tax calculation" : "View tax calculation"}
          </Button>
          {showBreakdown && calculation ? (
            <div className="mt-3 space-y-2 rounded-[var(--nova-radius-sm)] border border-[var(--nova-border)] px-4 py-3 text-sm">
              <p>
                <strong>
                  FY {calculation.financialYear} / AY {calculation.assessmentYear}
                </strong>{" "}
                · {calculation.regime} · {calculation.residentialStatus}
              </p>
              <ul className="grid gap-1 sm:grid-cols-2">
                <li>
                  Projected annual gross: <MoneyValue value={calculation.tax.projectedAnnualGross} />
                </li>
                <li>
                  Standard deduction: <MoneyValue value={calculation.tax.standardDeduction} />
                </li>
                <li>
                  Other deductions: <MoneyValue value={calculation.tax.otherDeductions} />
                </li>
                <li>
                  Taxable income: <MoneyValue value={calculation.tax.taxableIncome} />
                </li>
                <li>
                  Tax before rebate: <MoneyValue value={calculation.tax.taxBeforeRebate} />
                </li>
                <li>
                  §87A rebate: <MoneyValue value={calculation.tax.rebate} />
                </li>
                <li>
                  Marginal relief (rebate):{" "}
                  <MoneyValue value={calculation.tax.marginalReliefRebate} />
                </li>
                <li>
                  Surcharge: <MoneyValue value={calculation.tax.surcharge} />
                </li>
                <li>
                  Cess (4%): <MoneyValue value={calculation.tax.cess} />
                </li>
                <li>
                  Annual tax: <MoneyValue value={calculation.tax.annualTax} />
                </li>
                <li>
                  Indicative monthly TDS: <MoneyValue value={calculation.indicativeMonthlyTds} />
                </li>
                <li>
                  Period-specific monthly TDS:{" "}
                  <MoneyValue value={calculation.periodSpecificMonthlyTds} />
                </li>
                <li>Remaining payroll periods: {calculation.remainingPayrollPeriods}</li>
                <li>
                  Professional tax: <MoneyValue value={calculation.monthlyProfessionalTax} />
                </li>
                <li>
                  Expected monthly net:{" "}
                  <MoneyValue value={calculation.expectedMonthlyNetCalculated} />
                </li>
              </ul>
              <div>
                <p className="font-semibold">Tax by slab</p>
                <ul className="mt-1 space-y-0.5 text-xs text-[var(--nova-text-secondary)]">
                  {calculation.tax.taxBySlab.map((line, idx) => (
                    <li key={idx}>
                      ₹{line.from.toLocaleString("en-IN")}–
                      {line.to == null ? "∞" : `₹${line.to.toLocaleString("en-IN")}`} @{" "}
                      {(line.rate * 100).toFixed(0)}%: tax ₹{line.tax.toLocaleString("en-IN")} on ₹
                      {line.taxableInSlab.toLocaleString("en-IN")}
                    </li>
                  ))}
                </ul>
              </div>
              {calculation.excessTdsReviewRequired ? (
                <AlertBanner tone="danger">
                  Prior TDS exceeds revised projection by ₹
                  {calculation.excessTdsAmount.toLocaleString("en-IN")} — flag for payroll review
                  (no negative deduction generated).
                </AlertBanner>
              ) : null}
              <ul className="list-disc pl-5 text-xs text-[var(--nova-muted)]">
                {calculation.tax.assumptions.map((a) => (
                  <li key={a}>{a}</li>
                ))}
                {calculation.tax.unsupportedNotes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
                <li>{calculation.disclaimer}</li>
                <li>
                  Rule source:{" "}
                  <a
                    href={calculation.ruleSourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    {calculation.ruleSourceUrl}
                  </a>
                </li>
              </ul>
            </div>
          ) : null}
          {showBreakdown && !calculation && calcError ? (
            <AlertBanner tone="danger">{calcError}</AlertBanner>
          ) : null}
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
              {displayedGross?.toLocaleString("en-IN")}. Payslips use the components; reconciliation
              uses the expected net.
            </p>
          ) : null}
          <p className="mt-2 text-xs text-[var(--nova-muted)]">
            Non-cash CTC codes (EMPLOYER_PF, GRATUITY, EMPLOYER_ESI, NPS_EMPLOYER) are deducted
            before deriving cash gross.
          </p>
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
          <Button type="submit" disabled={busy || !!calcError}>
            {busy ? "Saving…" : "Save salary structure"}
          </Button>
          <span className="text-xs text-[var(--nova-muted)]">
            Saving creates a new version; earlier versions stay available for issued payslips. Draft
            payroll lines are flagged for recalculation.
          </span>
        </div>

        {calcError && !showBreakdown ? <AlertBanner tone="danger">{calcError}</AlertBanner> : null}
        {error ? <AlertBanner tone="danger">{error}</AlertBanner> : null}
        {message ? <AlertBanner tone="success">{message}</AlertBanner> : null}
      </form>
    </Card>
  );
}

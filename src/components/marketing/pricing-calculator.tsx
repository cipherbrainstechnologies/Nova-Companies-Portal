"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { SiteCopy } from "@/content/public-site";
import { Label } from "@/components/ui";
import { MarketingLink } from "@/components/marketing/blocks";

type CalculatorCopy = SiteCopy["pricing"]["calculator"];

type BreakdownResponse = {
  publicReference: string;
  expiresAt: string;
  breakdown: {
    perEmployee: {
      lineItems: Array<{ code: string; label: string; amountInr: number; category: string }>;
      totalMonthlyEmployerCostInr: number;
      totalMonthlyEmployeeNetInr: number;
    };
    consolidated: {
      headcount: number;
      monthlyTotalInr: number;
      annualTotalInr: number;
      monthlyBillingCurrency: number;
      annualBillingCurrency: number;
      oneOffOnboardingInr: number;
    };
    fx: { billingCurrency: string; inrPerUnit: number; asOfIso: string; spreadBps: number };
    assumptions: string[];
    disclaimers: string[];
    plan: { label: string };
  };
};

const STATES = [
  { code: "MH", label: "Maharashtra" },
  { code: "KA", label: "Karnataka" },
  { code: "TN", label: "Tamil Nadu" },
  { code: "TG", label: "Telangana" },
  { code: "WB", label: "West Bengal" },
  { code: "DL", label: "Delhi NCR (PT review)" },
] as const;

function formatInr(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatForeign(n: number, currency: string) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

export function PricingCalculator({ copy }: { copy: CalculatorCopy }) {
  const params = useSearchParams();
  const [compensationBasis, setCompensationBasis] = useState<"GROSS" | "CTC">("GROSS");
  const [monthlyCompensation, setMonthlyCompensation] = useState("85000");
  const [headcount, setHeadcount] = useState("1");
  const [benefits, setBenefits] = useState("2500");
  const [billingCurrency, setBillingCurrency] = useState("GBP");
  const [stateCode, setStateCode] = useState("MH");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "ready">("idle");
  const [result, setResult] = useState<BreakdownResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const salary = params.get("salary");
    const hc = params.get("headcount");
    const cur = params.get("currency");
    if (salary) setMonthlyCompensation(salary.replace(/\D/g, ""));
    if (hc) setHeadcount(hc.replace(/\D/g, ""));
    if (cur) setBillingCurrency(cur.toUpperCase());
  }, [params]);

  const numericComp = useMemo(() => Number(monthlyCompensation.replace(/\D/g, "")), [monthlyCompensation]);
  const numericHc = useMemo(() => Number(headcount.replace(/\D/g, "")), [headcount]);

  const runEstimate = useCallback(async () => {
    setStatus("loading");
    setErrorMessage(null);
    const res = await fetch("/api/public/estimates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        compensationBasis,
        monthlyCompensationInr: numericComp,
        headcount: numericHc || 1,
        monthlyBenefitsInr: Number(benefits.replace(/\D/g, "")) || 0,
        billingCurrency,
        stateCode,
      }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string } | null;
      setStatus("error");
      setErrorMessage(body?.message ?? copy.errorGeneric);
      setResult(null);
      return;
    }
    const data = (await res.json()) as BreakdownResponse;
    setResult(data);
    setStatus("ready");
  }, [benefits, billingCurrency, compensationBasis, copy.errorGeneric, numericComp, numericHc, stateCode]);

  useEffect(() => {
    if (numericComp >= 5000) {
      void runEstimate();
    }
  }, [numericComp, numericHc, compensationBasis, benefits, billingCurrency, stateCode, runEstimate]);

  const employerLines =
    result?.breakdown.perEmployee.lineItems.filter((l) =>
      ["employee_cash", "employer_statutory", "benefits", "service_fee", "tax"].includes(l.category),
    ) ?? [];

  const deductionLines =
    result?.breakdown.perEmployee.lineItems.filter((l) => l.category === "employee_deduction") ?? [];

  return (
    <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.1fr]">
      <form
        className="rounded-[var(--mkt-radius-lg)] border border-[var(--mkt-border)] bg-[var(--mkt-surface)] p-6 md:p-8"
        onSubmit={(e) => {
          e.preventDefault();
          void runEstimate();
        }}
      >
        <h2 className="h-display text-xl text-[var(--nova-ink)]">{copy.title}</h2>
        <p className="mt-2 text-sm text-[var(--nova-text-secondary)]">{copy.lede}</p>

        <fieldset className="mt-6">
          <legend className="text-sm font-semibold text-[var(--nova-ink)]">{copy.basisLabel}</legend>
          <div className="mt-2 flex flex-wrap gap-3">
            {(["GROSS", "CTC"] as const).map((value) => (
              <label key={value} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="basis"
                  value={value}
                  checked={compensationBasis === value}
                  onChange={() => setCompensationBasis(value)}
                />
                {value === "GROSS" ? copy.basisGross : copy.basisCtc}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="calc-comp">{copy.compensation}</Label>
            <input
              id="calc-comp"
              className="mt-1 w-full rounded-[var(--nova-radius-sm)] border border-[var(--nova-border-strong)] bg-white px-3 py-2.5 text-sm tabular-nums"
              inputMode="numeric"
              value={monthlyCompensation}
              onChange={(e) => setMonthlyCompensation(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="calc-hc">{copy.headcount}</Label>
            <input
              id="calc-hc"
              className="mt-1 w-full rounded-[var(--nova-radius-sm)] border border-[var(--nova-border-strong)] bg-white px-3 py-2.5 text-sm tabular-nums"
              inputMode="numeric"
              value={headcount}
              onChange={(e) => setHeadcount(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="calc-benefits">{copy.benefits}</Label>
            <input
              id="calc-benefits"
              className="mt-1 w-full rounded-[var(--nova-radius-sm)] border border-[var(--nova-border-strong)] bg-white px-3 py-2.5 text-sm tabular-nums"
              inputMode="numeric"
              value={benefits}
              onChange={(e) => setBenefits(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="calc-state">{copy.state}</Label>
            <select
              id="calc-state"
              className="mt-1 w-full rounded-[var(--nova-radius-sm)] border border-[var(--nova-border-strong)] bg-white px-3 py-2.5 text-sm"
              value={stateCode}
              onChange={(e) => setStateCode(e.target.value)}
            >
              {STATES.map((s) => (
                <option key={s.code} value={s.code}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="calc-currency">{copy.currency}</Label>
            <select
              id="calc-currency"
              className="mt-1 w-full rounded-[var(--nova-radius-sm)] border border-[var(--nova-border-strong)] bg-white px-3 py-2.5 text-sm"
              value={billingCurrency}
              onChange={(e) => setBillingCurrency(e.target.value)}
            >
              {["INR", "GBP", "USD", "EUR", "AUD"].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-[var(--nova-radius-sm)] bg-[var(--nova-purple)] px-5 text-sm font-semibold text-white hover:bg-[var(--nova-purple-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--nova-purple)]"
          disabled={status === "loading"}
        >
          {status === "loading" ? copy.calculating : copy.recalculate}
        </button>

        {status === "error" && errorMessage ? (
          <p className="mt-4 text-sm text-[var(--nova-danger)]" role="alert">{errorMessage}</p>
        ) : null}
      </form>

      <div
        className="rounded-[var(--mkt-radius-lg)] border border-[var(--mkt-border)] bg-[var(--mkt-surface)] p-6 md:p-8"
        aria-live="polite"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--nova-text-secondary)]">
          {copy.resultLabel}
        </p>
        {!result ? (
          <p className="mt-4 text-sm text-[var(--nova-text-secondary)]">{copy.resultEmpty}</p>
        ) : (
          <>
            <p className="mt-2 text-sm text-[var(--nova-text-secondary)]">
              {copy.reference}: <span className="font-mono font-semibold text-[var(--nova-ink)]">{result.publicReference}</span>
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <TotalCard label={copy.perEmployeeMonthly} value={formatInr(result.breakdown.perEmployee.totalMonthlyEmployerCostInr)} />
              <TotalCard
                label={`${copy.teamMonthly} (${result.breakdown.consolidated.headcount} employees)`}
                value={formatInr(result.breakdown.consolidated.monthlyTotalInr)}
              />
              <TotalCard
                label={`${copy.billingMonthly} (${result.breakdown.fx.billingCurrency})`}
                value={formatForeign(
                  result.breakdown.consolidated.monthlyBillingCurrency,
                  result.breakdown.fx.billingCurrency,
                )}
              />
              <TotalCard label={copy.employeeNet} value={formatInr(result.breakdown.perEmployee.totalMonthlyEmployeeNetInr)} />
            </div>

            <h3 className="mt-8 text-sm font-bold text-[var(--nova-ink)]">{copy.employerLines}</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {employerLines.map((line) => (
                <li key={line.code} className="flex justify-between gap-4 border-b border-[var(--mkt-border)] pb-2">
                  <span className="text-[var(--nova-text-secondary)]">{line.label}</span>
                  <span className="tabular-nums font-medium text-[var(--nova-ink)]">{formatInr(line.amountInr)}</span>
                </li>
              ))}
            </ul>

            <h3 className="mt-6 text-sm font-bold text-[var(--nova-ink)]">{copy.deductionLines}</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {deductionLines.map((line) => (
                <li key={line.code} className="flex justify-between gap-4 border-b border-[var(--mkt-border)] pb-2">
                  <span className="text-[var(--nova-text-secondary)]">{line.label}</span>
                  <span className="tabular-nums font-medium text-[var(--nova-ink)]">{formatInr(line.amountInr)}</span>
                </li>
              ))}
            </ul>

            <details className="mt-6 text-sm text-[var(--nova-text-secondary)]">
              <summary className="cursor-pointer font-semibold text-[var(--nova-ink)]">{copy.assumptionsToggle}</summary>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {result.breakdown.assumptions.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </details>

            <ul className="mt-4 space-y-2 text-xs leading-relaxed text-[var(--nova-text-secondary)]">
              {result.breakdown.disclaimers.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <MarketingLink href={`/contact?estimate=${result.publicReference}`}>{copy.requestProposal}</MarketingLink>
              <Link href="/fx-transparency" className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--nova-navy)] underline decoration-[var(--nova-border)] underline-offset-4">
                {copy.fxLink}
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function TotalCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--mkt-radius)] border border-[var(--mkt-border)] bg-[var(--mkt-canvas)] px-4 py-3">
      <p className="text-xs text-[var(--nova-text-secondary)]">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums text-[var(--nova-ink)]">{value}</p>
    </div>
  );
}

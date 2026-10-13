"use client";

import { useMemo, useState } from "react";
import {
  ILLUSTRATIVE_INR_PER_UNIT,
  ILLUSTRATIVE_SOURCE,
  SETTLEMENT_CURRENCIES,
  buildIllustrativeFxQuote,
  type FxIllustrationError,
  type SettlementCurrency,
} from "@/lib/public/fx-illustration";

const ERROR_TEXT: Record<FxIllustrationError, string> = {
  invalid_amount: "Enter an employment cost in INR greater than zero.",
  invalid_spread: "Enter a whole-number spread from 0 to 1,000 basis points, or leave it at 0.",
  invalid_fee: "Enter a Nova fee of zero or more INR, or leave it at 0.",
  invalid_deduction: "Enter a bank deduction of zero or more in the settlement currency, or leave it at 0.",
};

const CURRENCY_LABEL: Record<SettlementCurrency, string> = {
  GBP: "GBP — British pound",
  USD: "USD — US dollar",
  CAD: "CAD — Canadian dollar",
  AUD: "AUD — Australian dollar",
  AED: "AED — UAE dirham",
};

function groupAmount(value: string, locale: string): string {
  const [whole, frac = "00"] = value.split(".");
  return `${Number(whole).toLocaleString(locale)}.${frac}`;
}

function formatStamp(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export function FxIllustrationCalculator() {
  const [employmentCostInr, setEmploymentCostInr] = useState("381800");
  const [currency, setCurrency] = useState<SettlementCurrency>("GBP");
  const [spreadBps, setSpreadBps] = useState("0");
  const [novaFeeInr, setNovaFeeInr] = useState("0");
  const [bankDeduction, setBankDeduction] = useState("0");

  const result = useMemo(() => {
    const spread = Number(spreadBps);
    return buildIllustrativeFxQuote({
      employmentCostInr,
      currency,
      spreadBps: Number.isFinite(spread) ? spread : Number.NaN,
      novaFeeInr,
      bankDeduction,
    });
  }, [employmentCostInr, currency, spreadBps, novaFeeInr, bankDeduction]);

  return (
    <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <form className="space-y-4" onSubmit={(event) => event.preventDefault()}>
        <p className="text-sm font-semibold text-[var(--nova-ink)]">Illustrative invoice calculator</p>
        <p className="text-sm leading-relaxed text-[var(--nova-text-secondary)]">
          Sample figures only. This is not a live conversion rate and not a quote you can pay against.
        </p>
        <Field id="employment-cost" label="Employment cost (INR)" hint="Underlying employment cost in rupees">
          <input
            id="employment-cost"
            inputMode="decimal"
            value={employmentCostInr}
            onChange={(event) => setEmploymentCostInr(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field id="settlement-currency" label="Settlement currency">
          <select
            id="settlement-currency"
            value={currency}
            onChange={(event) => setCurrency(event.target.value as SettlementCurrency)}
            className={inputClass}
          >
            {SETTLEMENT_CURRENCIES.map((code) => (
              <option key={code} value={code}>
                {CURRENCY_LABEL[code]}
              </option>
            ))}
          </select>
        </Field>
        <Field
          id="spread-bps"
          label="Illustrative provider spread (basis points)"
          hint="Leave at 0. A real quote discloses the bank or provider spread. This page does not apply a default Nova percentage."
        >
          <input
            id="spread-bps"
            inputMode="numeric"
            value={spreadBps}
            onChange={(event) => setSpreadBps(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field id="nova-fee" label="Illustrative Nova FX fee (INR)" hint="Leave at 0 unless you are previewing a fee your quote would list separately.">
          <input
            id="nova-fee"
            inputMode="decimal"
            value={novaFeeInr}
            onChange={(event) => setNovaFeeInr(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field
          id="bank-deduction"
          label={`Illustrative bank deduction (${currency})`}
          hint="Leave at 0. Use this only to see how a bank charge would reduce the amount received."
        >
          <input
            id="bank-deduction"
            inputMode="decimal"
            value={bankDeduction}
            onChange={(event) => setBankDeduction(event.target.value)}
            className={inputClass}
          />
        </Field>
      </form>

      <div aria-live="polite" className="rounded-[var(--mkt-radius-lg)] border border-[var(--mkt-border)] bg-[var(--mkt-surface)] p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--nova-muted)]">Illustrative result</p>
        {!result.ok ? (
          <p role="alert" className="mt-4 text-sm font-medium text-[var(--nova-danger)]">
            {ERROR_TEXT[result.error]}
          </p>
        ) : (
          <dl className="mt-4 space-y-3 text-sm">
            <Row term="Reference source" value={ILLUSTRATIVE_SOURCE} />
            <Row term="Sample rate" value={`${result.inrPerUnit} INR per 1 ${result.currency}`} />
            <Row term="Employment cost" value={`₹${groupAmount(result.employmentCostInr, "en-IN")}`} />
            <Row term="Reference conversion" value={`${groupAmount(result.referenceSettlement, "en-GB")} ${result.currency}`} />
            <Row term="Provider spread" value={`${groupAmount(result.spreadInSettlement, "en-GB")} ${result.currency} (${result.spreadBps} bps)`} />
            <Row term="Nova FX fee" value={`${groupAmount(result.novaFeeInSettlement, "en-GB")} ${result.currency} (₹${groupAmount(result.novaFeeInr, "en-IN")})`} />
            <Row term="Quoted settlement" value={`${groupAmount(result.quotedSettlement, "en-GB")} ${result.currency}`} />
            <Row term="Bank deduction" value={`${groupAmount(result.bankDeduction, "en-GB")} ${result.currency}`} />
            <Row term="Amount received" value={`${groupAmount(result.amountReceived, "en-GB")} ${result.currency}`} />
            <Row term="Shortfall to reconcile" value={`${groupAmount(result.shortfall, "en-GB")} ${result.currency}`} />
            <Row term="Example created" value={`${formatStamp(result.createdAtIso)} UTC`} />
            <Row term="Example expires" value={`${formatStamp(result.expiresAtIso)} UTC`} />
          </dl>
        )}
        <p className="mt-5 text-xs leading-relaxed text-[var(--nova-muted)]">
          Sample INR per unit: {SETTLEMENT_CURRENCIES.map((code) => `${code} ${ILLUSTRATIVE_INR_PER_UNIT[code]}`).join(", ")}.
          The example expiry is 24 hours after creation so the timestamps are visible. A payable quote uses the validity recorded for that quote.
        </p>
      </div>
    </div>
  );
}

const inputClass =
  "min-h-11 w-full rounded-[var(--nova-radius-sm)] border border-[var(--nova-border-strong)] bg-[var(--nova-surface)] px-3 py-2.5 text-sm text-[var(--nova-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--nova-purple)]";

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold text-[var(--nova-ink)]">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs leading-relaxed text-[var(--nova-muted)]">{hint}</p> : null}
    </div>
  );
}

function Row({ term, value }: { term: string; value: string }) {
  return (
    <div className="grid gap-1 border-b border-[var(--mkt-border)] pb-3 sm:grid-cols-[11rem_1fr] sm:gap-4">
      <dt className="text-[var(--nova-muted)]">{term}</dt>
      <dd className="font-medium text-[var(--nova-ink)]">{value}</dd>
    </div>
  );
}

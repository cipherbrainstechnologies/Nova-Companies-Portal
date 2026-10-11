/** Indicative FX for public estimates only — not a trading or invoice rate. */

export type BillingCurrency = "INR" | "GBP" | "USD" | "EUR" | "AUD";

export type IndicativeFxQuote = {
  billingCurrency: BillingCurrency;
  inrPerUnit: number;
  source: string;
  asOfIso: string;
  spreadBps: number;
  bankFeeInr: number;
  disclaimer: string;
};

const DEFAULT_INR_PER_UNIT: Record<BillingCurrency, number> = {
  INR: 1,
  USD: 83.5,
  GBP: 105.2,
  EUR: 90.1,
  AUD: 55.4,
};

function parseEnvRate(key: string): number | null {
  const raw = process.env[key];
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function getIndicativeFxQuote(
  billingCurrency: BillingCurrency,
  asOf: Date = new Date(),
): IndicativeFxQuote {
  const envKey = `PUBLIC_FX_INR_PER_${billingCurrency}`;
  const inrPerUnit =
    billingCurrency === "INR"
      ? 1
      : (parseEnvRate(envKey) ?? DEFAULT_INR_PER_UNIT[billingCurrency]);

  const spreadBps = Number(process.env.PUBLIC_FX_SPREAD_BPS ?? "75");
  const bankFeeInr = Number(process.env.PUBLIC_FX_BANK_FEE_INR ?? "500");

  return {
    billingCurrency,
    inrPerUnit,
    source: process.env.PUBLIC_FX_SOURCE_LABEL ?? "Indicative mid-market reference (not invoice rate)",
    asOfIso: asOf.toISOString(),
    spreadBps: Number.isFinite(spreadBps) ? spreadBps : 75,
    bankFeeInr: Number.isFinite(bankFeeInr) ? bankFeeInr : 500,
    disclaimer:
      "Indicative conversion for planning only. Your signed proposal and invoice disclose the rate source, spread, fees, and settlement terms.",
  };
}

export function inrToBillingCurrency(inr: number, quote: IndicativeFxQuote): number {
  if (quote.billingCurrency === "INR") return inr;
  const withSpread = inr * (1 + quote.spreadBps / 10_000);
  return withSpread / quote.inrPerUnit;
}

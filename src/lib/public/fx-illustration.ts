import Decimal from "decimal.js";

/**
 * Illustrative FX arithmetic for the public FX & payments page.
 * Mock rates only. This module does not read env rates and does not
 * change invoice quotes or the employment-cost estimate.
 */

export const SETTLEMENT_CURRENCIES = ["GBP", "USD", "CAD", "AUD", "AED"] as const;

export type SettlementCurrency = (typeof SETTLEMENT_CURRENCIES)[number];

/** INR per 1 unit of settlement currency. Sample figures, not a live rate. */
export const ILLUSTRATIVE_INR_PER_UNIT: Record<SettlementCurrency, string> = {
  GBP: "105.20",
  USD: "83.50",
  CAD: "61.40",
  AUD: "55.40",
  AED: "22.75",
};

export const ILLUSTRATIVE_SOURCE =
  "Illustrative reference sample (not a live bank rate, provider quote, or guaranteed forward rate)";

export const ILLUSTRATIVE_QUOTE_TTL_MS = 24 * 60 * 60 * 1000;

const MAX_EMPLOYMENT_INR = 100_000_000;
const MAX_SPREAD_BPS = 1_000;

export type FxIllustrationError = "invalid_amount" | "invalid_spread" | "invalid_fee" | "invalid_deduction";

export type FxIllustrationInput = {
  employmentCostInr: string;
  currency: SettlementCurrency;
  spreadBps?: number;
  novaFeeInr?: string;
  bankDeduction?: string;
  createdAt?: Date;
};

export type FxIllustrationQuote = {
  ok: true;
  currency: SettlementCurrency;
  employmentCostInr: string;
  inrPerUnit: string;
  source: string;
  spreadBps: number;
  spreadInSettlement: string;
  novaFeeInr: string;
  novaFeeInSettlement: string;
  referenceSettlement: string;
  quotedSettlement: string;
  bankDeduction: string;
  amountReceived: string;
  shortfall: string;
  createdAtIso: string;
  expiresAtIso: string;
};

export type FxIllustrationResult = FxIllustrationQuote | { ok: false; error: FxIllustrationError };

export function roundMoney(value: Decimal): string {
  return value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2);
}

function parseMoney(raw: string): Decimal | null {
  const trimmed = raw.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null;
  try {
    const value = new Decimal(trimmed);
    if (!value.isFinite()) return null;
    return value;
  } catch {
    return null;
  }
}

export function buildIllustrativeFxQuote(input: FxIllustrationInput): FxIllustrationResult {
  const employment = parseMoney(input.employmentCostInr);
  if (!employment || employment.lte(0) || employment.gt(MAX_EMPLOYMENT_INR)) {
    return { ok: false, error: "invalid_amount" };
  }

  const spreadBps = input.spreadBps ?? 0;
  if (!Number.isInteger(spreadBps) || spreadBps < 0 || spreadBps > MAX_SPREAD_BPS) {
    return { ok: false, error: "invalid_spread" };
  }

  const novaFee = parseMoney(input.novaFeeInr ?? "0");
  if (!novaFee || novaFee.lt(0) || novaFee.gt(MAX_EMPLOYMENT_INR)) {
    return { ok: false, error: "invalid_fee" };
  }

  const bankDeduction = parseMoney(input.bankDeduction ?? "0");
  if (!bankDeduction || bankDeduction.lt(0) || bankDeduction.gt(MAX_EMPLOYMENT_INR)) {
    return { ok: false, error: "invalid_deduction" };
  }

  const rate = new Decimal(ILLUSTRATIVE_INR_PER_UNIT[input.currency]);
  const referenceSettlement = roundMoney(employment.div(rate));
  const spreadInSettlement = roundMoney(new Decimal(referenceSettlement).mul(spreadBps).div(10_000));
  const novaFeeInSettlement = roundMoney(novaFee.div(rate));
  const quoted = new Decimal(referenceSettlement).plus(spreadInSettlement).plus(novaFeeInSettlement);
  const quotedSettlement = roundMoney(quoted);
  const deduction = roundMoney(bankDeduction);
  const received = new Decimal(quotedSettlement).minus(deduction);
  const amountReceived = roundMoney(received);
  const shortfall = received.lt(0) ? roundMoney(received.abs()) : deduction;

  const createdAt = input.createdAt ?? new Date();
  const expiresAt = new Date(createdAt.getTime() + ILLUSTRATIVE_QUOTE_TTL_MS);

  return {
    ok: true,
    currency: input.currency,
    employmentCostInr: roundMoney(employment),
    inrPerUnit: rate.toFixed(2),
    source: ILLUSTRATIVE_SOURCE,
    spreadBps,
    spreadInSettlement,
    novaFeeInr: roundMoney(novaFee),
    novaFeeInSettlement,
    referenceSettlement,
    quotedSettlement,
    bankDeduction: deduction,
    amountReceived,
    shortfall,
    createdAtIso: createdAt.toISOString(),
    expiresAtIso: expiresAt.toISOString(),
  };
}

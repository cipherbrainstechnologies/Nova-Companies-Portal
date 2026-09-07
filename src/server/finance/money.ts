import Decimal from "decimal.js";

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export function money(n: number | string | Decimal): Decimal {
  return new Decimal(n);
}

export function moneySum(values: Array<number | string | Decimal>): Decimal {
  return values.reduce<Decimal>((acc, v) => acc.plus(money(v)), money(0));
}

/** Canonical 2-decimal INR amount for persistence and display math. */
export function roundInr(n: number | string | Decimal): number {
  return money(n).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
}

export function assertIdentity(
  label: string,
  left: number | string | Decimal,
  right: number | string | Decimal,
) {
  const a = money(left).toDecimalPlaces(2);
  const b = money(right).toDecimalPlaces(2);
  if (!a.equals(b)) {
    throw new Error(`${label} mismatch: ${a.toFixed(2)} !== ${b.toFixed(2)}`);
  }
}

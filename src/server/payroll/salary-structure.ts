/**
 * Pure salary-structure helpers shared by the salary-structure API, reconciliation
 * automation and the admin UI. Deliberately free of Prisma/queue imports so it can be
 * unit tested and imported from client-safe code paths.
 */

export const MONTHS_PER_YEAR = 12;

/** Accepts plain numbers, numeric strings and Prisma `Decimal` columns. */
export type AmountLike = number | string | { toString(): string } | null | undefined;

export type SalaryStructureNumbers = {
  annualCtc?: AmountLike;
  monthlyGross?: AmountLike;
  monthlyTds?: AmountLike;
  monthlyPt?: AmountLike;
  expectedMonthlyNet?: AmountLike;
};

export type SalaryStructureCompleteness = {
  complete: boolean;
  missing: string[];
  expectedMonthlyNet: number | null;
};

export function roundInr(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Accepts numbers, numeric strings and Prisma `Decimal` instances. */
export function toAmount(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const raw = typeof value === "string" ? value : String(value);
  const parsed = Number(raw.replace(/[₹,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

export function monthlyGrossFromAnnualCtc(annualCtc: AmountLike): number | null {
  const ctc = toAmount(annualCtc);
  if (ctc == null || ctc <= 0) return null;
  return roundInr(ctc / MONTHS_PER_YEAR);
}

/**
 * Expected monthly net = gross − TDS − PT. An explicitly supplied net always wins so
 * operators can record the exact figure the bank will show.
 */
export function deriveExpectedMonthlyNet(input: SalaryStructureNumbers): number | null {
  const explicit = toAmount(input.expectedMonthlyNet);
  if (explicit != null && explicit > 0) return roundInr(explicit);

  const gross = toAmount(input.monthlyGross) ?? monthlyGrossFromAnnualCtc(input.annualCtc);
  if (gross == null || gross <= 0) return null;

  const tds = toAmount(input.monthlyTds) ?? 0;
  const pt = toAmount(input.monthlyPt) ?? 0;
  const net = roundInr(gross - tds - pt);
  return net > 0 ? net : null;
}

export function salaryStructureCompleteness(
  input: SalaryStructureNumbers | null | undefined,
): SalaryStructureCompleteness {
  if (!input) {
    return {
      complete: false,
      missing: ["salaryStructure"],
      expectedMonthlyNet: null,
    };
  }

  const missing: string[] = [];
  const gross = toAmount(input.monthlyGross) ?? monthlyGrossFromAnnualCtc(input.annualCtc);
  if (gross == null || gross <= 0) missing.push("monthlyGross");

  const expectedMonthlyNet = deriveExpectedMonthlyNet(input);
  if (expectedMonthlyNet == null || expectedMonthlyNet <= 0) missing.push("expectedMonthlyNet");

  return { complete: missing.length === 0, missing, expectedMonthlyNet };
}

export function isSalaryStructureComplete(
  input: SalaryStructureNumbers | null | undefined,
): boolean {
  return salaryStructureCompleteness(input).complete;
}

/** Matches the normalisation used by `EmployeePaymentAlias.normalizedAlias`. */
export function normalizePaymentAlias(alias: string): string {
  return alias
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

export function normalizePaymentAliases(
  aliases: Array<string | null | undefined>,
): Array<{ alias: string; normalizedAlias: string }> {
  const seen = new Set<string>();
  const result: Array<{ alias: string; normalizedAlias: string }> = [];
  for (const raw of aliases) {
    const alias = (raw ?? "").trim();
    if (!alias) continue;
    const normalizedAlias = normalizePaymentAlias(alias);
    if (!normalizedAlias || seen.has(normalizedAlias)) continue;
    seen.add(normalizedAlias);
    result.push({ alias, normalizedAlias });
  }
  return result;
}

export function componentsSum(components: Record<string, unknown> | null | undefined): number {
  if (!components) return 0;
  return roundInr(
    Object.values(components).reduce<number>((total, value) => total + (toAmount(value) ?? 0), 0),
  );
}

export type PayrollPeriodKey = { employeeId: string; year: number; month: number };

/**
 * One payslip per employee per salary month. Callers pass the periods already recorded
 * for the company; a repeat of the same employee/month must never create a second line.
 */
export function isDuplicatePayrollPeriod(
  existing: PayrollPeriodKey[],
  candidate: PayrollPeriodKey,
): boolean {
  return existing.some(
    (period) =>
      period.employeeId === candidate.employeeId &&
      period.year === candidate.year &&
      period.month === candidate.month,
  );
}

export function payrollPeriodKey(period: PayrollPeriodKey): string {
  return `${period.employeeId}:${period.year}-${String(period.month).padStart(2, "0")}`;
}

export type SalaryComponentDefinition = {
  code: string;
  label: string;
  /** Alternate spellings accepted from imported or hand-entered component payloads. */
  aliases: string[];
};

/** Canonical earning components in Form IV-B display order. */
export const DEFAULT_EARNING_CODES: readonly SalaryComponentDefinition[] = [
  { code: "BASIC", label: "Consolidated/Basic", aliases: ["basic", "basicSalary", "consolidated"] },
  { code: "HRA", label: "HRA", aliases: ["hra", "houseRentAllowance"] },
  { code: "CONVEYANCE", label: "Conveyance allowance", aliases: ["conveyance", "transport"] },
  { code: "MEDICAL", label: "Medical allowance", aliases: ["medical"] },
  { code: "SPECIAL", label: "Special allowance", aliases: ["special", "specialAllowance"] },
  { code: "OTHER_ALLOWANCE", label: "Other allowance", aliases: ["otherAllowance", "allowance"] },
  { code: "OVERTIME", label: "Overtime", aliases: ["overtime", "ot"] },
  { code: "BONUS", label: "Bonus", aliases: ["bonus", "incentive"] },
  { code: "ARREARS", label: "Arrears", aliases: ["arrears"] },
  { code: "REIMBURSEMENT", label: "Reimbursement", aliases: ["reimbursement"] },
];

/** Canonical deduction components. `PT` and `TDS` also have dedicated structure columns. */
export const DEFAULT_DEDUCTION_CODES: readonly SalaryComponentDefinition[] = [
  { code: "PF", label: "Provident fund", aliases: ["pf", "providentFund", "epf"] },
  { code: "ESI", label: "ESI", aliases: ["esi", "esic"] },
  { code: "PT", label: "Professional tax", aliases: ["pt", "professionalTax"] },
  { code: "TDS", label: "TDS", aliases: ["tds", "incomeTax"] },
  { code: "LOAN", label: "Loan / advance recovery", aliases: ["loan", "advance"] },
  { code: "LWP", label: "Leave without pay", aliases: ["lwp", "leaveWithoutPay", "unpaidLeave"] },
  { code: "OTHER_DEDUCTION", label: "Other deduction", aliases: ["otherDeduction"] },
];

function canonicalKey(value: string): string {
  return value.replace(/[^a-zA-Z0-9]+/g, "").toLowerCase();
}

/** Totals and net figures are derived, never treated as components. */
const NET_KEYS = ["netPay", "netAmount", "netSalary"].map(canonicalKey);
const NON_COMPONENT_KEYS = new Set(
  [
    ...NET_KEYS,
    "gross",
    "grossEarnings",
    "grossDeductions",
    "totalEarnings",
    "totalDeductions",
    "deductions",
  ].map(canonicalKey),
);

function buildDefinitionLookup(): Map<string, { definition: SalaryComponentDefinition; isEarning: boolean }> {
  const lookup = new Map<string, { definition: SalaryComponentDefinition; isEarning: boolean }>();
  const register = (definitions: readonly SalaryComponentDefinition[], isEarning: boolean) => {
    for (const definition of definitions) {
      lookup.set(canonicalKey(definition.code), { definition, isEarning });
      for (const alias of definition.aliases) {
        lookup.set(canonicalKey(alias), { definition, isEarning });
      }
    }
  };
  register(DEFAULT_EARNING_CODES, true);
  register(DEFAULT_DEDUCTION_CODES, false);
  return lookup;
}

const DEFINITION_LOOKUP = buildDefinitionLookup();

/**
 * Flattens a stored `componentsJson` payload into `{ CANONICAL_CODE: amount }`.
 * Accepts flat maps and `{ earnings: {...}, deductions: {...} }` shapes, and tolerates
 * numeric strings so hand-edited structures still resolve.
 */
export function componentsFromJson(json: unknown): Record<string, number> {
  if (!json || typeof json !== "object" || Array.isArray(json)) return {};

  const flat: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(json as Record<string, unknown>)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      for (const [nestedKey, nestedValue] of Object.entries(value as Record<string, unknown>)) {
        flat[nestedKey] = nestedValue;
      }
      continue;
    }
    flat[key] = value;
  }

  const components: Record<string, number> = {};
  for (const [key, value] of Object.entries(flat)) {
    const amount = toAmount(value);
    if (amount == null) continue;
    const code = DEFINITION_LOOKUP.get(canonicalKey(key))?.definition.code ?? key.toUpperCase();
    components[code] = roundInr((components[code] ?? 0) + amount);
  }
  return components;
}

/** A salary structure row (Prisma or plain) plus its component payload. */
export type SalaryStructureRecord = SalaryStructureNumbers & {
  version?: number | null;
  effectiveFrom?: Date | string | null;
  componentsJson?: unknown;
  notes?: string | null;
};

function numbersFrom(structure: SalaryStructureRecord): SalaryStructureNumbers {
  return {
    annualCtc: toAmount(structure.annualCtc),
    monthlyGross: toAmount(structure.monthlyGross),
    monthlyTds: toAmount(structure.monthlyTds),
    monthlyPt: toAmount(structure.monthlyPt),
    expectedMonthlyNet: toAmount(structure.expectedMonthlyNet),
  };
}

/**
 * Decimal-tolerant expected monthly net for a persisted structure row.
 *
 * Prefers the stored figures via `deriveExpectedMonthlyNet`, then falls back to the
 * component payload so structures captured only as components still reconcile.
 */
export function resolveExpectedMonthlyNet(
  structure: SalaryStructureRecord | null | undefined,
): number | null {
  if (!structure) return null;

  const fromNumbers = deriveExpectedMonthlyNet(numbersFrom(structure));
  if (fromNumbers != null) return fromNumbers;

  const components = componentsFromJson(structure.componentsJson);
  for (const [code, amount] of Object.entries(components)) {
    if (NET_KEYS.includes(canonicalKey(code)) && amount > 0) return roundInr(amount);
  }

  const derived = structureToEarningsDeductions(structure);
  return derived.netAmount > 0 ? derived.netAmount : null;
}

/**
 * Splits a structure into payslip earning and deduction lines with totals. Unknown
 * component codes are kept as earnings so no configured pay is silently dropped.
 */
export function structureToEarningsDeductions(structure: SalaryStructureRecord | null | undefined): {
  earnings: Array<{ code: string; label: string; actual: number; payable: number }>;
  deductions: Array<{ code: string; label: string; amount: number }>;
  grossEarnings: number;
  grossDeductions: number;
  netAmount: number;
} {
  const components = componentsFromJson(structure?.componentsJson);
  const earnings: Array<{ code: string; label: string; actual: number; payable: number }> = [];
  const deductions: Array<{ code: string; label: string; amount: number }> = [];
  const consumed = new Set<string>();

  for (const definition of DEFAULT_EARNING_CODES) {
    const amount = components[definition.code];
    if (amount == null) continue;
    consumed.add(definition.code);
    earnings.push({
      code: definition.code,
      label: definition.label,
      actual: amount,
      payable: amount,
    });
  }
  for (const definition of DEFAULT_DEDUCTION_CODES) {
    const amount = components[definition.code];
    if (amount == null) continue;
    consumed.add(definition.code);
    deductions.push({ code: definition.code, label: definition.label, amount });
  }
  for (const [code, amount] of Object.entries(components)) {
    if (consumed.has(code) || NON_COMPONENT_KEYS.has(canonicalKey(code))) continue;
    earnings.push({ code, label: humanizeComponentCode(code), actual: amount, payable: amount });
  }

  const monthlyPt = toAmount(structure?.monthlyPt);
  if (monthlyPt != null && monthlyPt > 0 && !deductions.some((entry) => entry.code === "PT")) {
    deductions.push({ code: "PT", label: "Professional tax", amount: roundInr(monthlyPt) });
  }
  const monthlyTds = toAmount(structure?.monthlyTds);
  if (monthlyTds != null && monthlyTds > 0 && !deductions.some((entry) => entry.code === "TDS")) {
    deductions.push({ code: "TDS", label: "TDS", amount: roundInr(monthlyTds) });
  }

  // A structure captured only as gross still needs one earning line to render.
  const monthlyGross =
    toAmount(structure?.monthlyGross) ?? monthlyGrossFromAnnualCtc(structure?.annualCtc);
  if (!earnings.length && monthlyGross != null && monthlyGross > 0) {
    earnings.push({
      code: "BASIC",
      label: "Consolidated/Basic",
      actual: roundInr(monthlyGross),
      payable: roundInr(monthlyGross),
    });
  }

  const grossEarnings = roundInr(earnings.reduce((total, entry) => total + entry.payable, 0));
  const grossDeductions = roundInr(deductions.reduce((total, entry) => total + entry.amount, 0));
  return {
    earnings,
    deductions,
    grossEarnings,
    grossDeductions,
    netAmount: roundInr(grossEarnings - grossDeductions),
  };
}

function humanizeComponentCode(code: string): string {
  const words = code.replace(/[_-]+/g, " ").toLowerCase().trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export type SalarySnapshot = {
  version: number;
  effectiveFrom: string | null;
  annualCtc: number | null;
  monthlyGross: number | null;
  monthlyTds: number | null;
  monthlyPt: number | null;
  expectedMonthlyNet: number | null;
  components: Record<string, number>;
  earnings: Array<{ code: string; label: string; actual: number; payable: number }>;
  deductions: Array<{ code: string; label: string; amount: number }>;
  grossEarnings: number;
  grossDeductions: number;
  netAmount: number;
  complete: boolean;
  missing: string[];
  notes: string | null;
};

/**
 * JSON-safe copy of the structure a payroll line was computed from, for
 * `PayrollEmployeeLine.calculationSnapshotJson`. Later structure edits must never
 * change what an already-issued payslip was derived from.
 */
export function toSalarySnapshot(
  structure: SalaryStructureRecord | null | undefined,
): SalarySnapshot {
  const numbers = structure ? numbersFrom(structure) : null;
  const completeness = salaryStructureCompleteness(numbers);
  const derived = structureToEarningsDeductions(structure);
  const effectiveFrom = structure?.effectiveFrom ?? null;

  return {
    version: structure?.version ?? 1,
    effectiveFrom:
      effectiveFrom instanceof Date
        ? effectiveFrom.toISOString()
        : typeof effectiveFrom === "string"
          ? effectiveFrom
          : null,
    annualCtc: toAmount(structure?.annualCtc),
    monthlyGross: toAmount(structure?.monthlyGross),
    monthlyTds: toAmount(structure?.monthlyTds),
    monthlyPt: toAmount(structure?.monthlyPt),
    expectedMonthlyNet: resolveExpectedMonthlyNet(structure),
    components: componentsFromJson(structure?.componentsJson),
    earnings: derived.earnings,
    deductions: derived.deductions,
    grossEarnings: derived.grossEarnings,
    grossDeductions: derived.grossDeductions,
    netAmount: derived.netAmount,
    complete: completeness.complete,
    missing: completeness.missing,
    notes: structure?.notes ?? null,
  };
}

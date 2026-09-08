import type { ProfitTreatment, TransactionClassification } from "@prisma/client";
import type { ProfitCategoryKey } from "@/server/finance/profit-categories";

export type DefaultProfitRule = {
  matchPattern: string;
  classification?: TransactionClassification;
  treatment: ProfitTreatment;
  categoryKey: ProfitCategoryKey;
  priority: number;
  label: string;
  /** When set, rule applies only to credits or only to debits. */
  direction?: "credit" | "debit";
};

/** Shared personal / financing / ignore patterns for both companies. */
export const SHARED_PROFIT_RULES: DefaultProfitRule[] = [
  {
    matchPattern: "HOME\\s*LOAN|HOME.?LOAN",
    classification: "LOAN_EMI",
    treatment: "FINANCING_OR_PERSONAL",
    categoryKey: "HOME_LOAN",
    priority: 20,
    label: "Home loan",
    direction: "debit",
  },
  {
    matchPattern: "BAJAJ",
    classification: "LOAN_EMI",
    treatment: "FINANCING_OR_PERSONAL",
    categoryKey: "BAJAJ_EMI",
    priority: 20,
    label: "Bajaj EMI",
    direction: "debit",
  },
  {
    matchPattern: "CREDIT\\s*CARD|CREDITCARD|CC\\s*PAYMENT|CREDIT.?CARD",
    classification: "CREDIT_CARD",
    treatment: "FINANCING_OR_PERSONAL",
    categoryKey: "CREDIT_CARD",
    priority: 20,
    label: "Credit-card payment",
    direction: "debit",
  },
  {
    // Approved Hardik cash salary routed via Love Chauhan transfer (NW).
    matchPattern: "MOB/TPFT/LOVE\\s+N\\s+CHAUHAN|TPFT/LOVE\\s+N\\s+CHAUHAN",
    treatment: "BUSINESS_EXPENSE",
    categoryKey: "CASH_SALARY",
    priority: 6,
    label: "Hardik cash salary (approved Love transfer)",
    direction: "debit",
  },
  {
    matchPattern: "\\bLOVE\\b|SHIVANI",
    classification: "OWNER_TRANSFER",
    treatment: "OWNER_EXCLUDED",
    categoryKey: "OWNER_TRANSFER",
    priority: 25,
    label: "Love / owner transfer",
    direction: "debit",
  },
  {
    matchPattern: "THREADS",
    treatment: "FINANCING_OR_PERSONAL",
    categoryKey: "OTHER_OUTFLOW",
    priority: 25,
    label: "Threads cheque",
    direction: "debit",
  },
  {
    matchPattern: "\\b(?:CASH|WDL|CWDR)\\b",
    treatment: "IGNORE",
    categoryKey: "UNCLASSIFIED",
    priority: 40,
    label: "Cash withdrawal — needs review",
    direction: "debit",
  },
  {
    matchPattern:
      "OPENING|CLOSING|BALANCE\\s*B/?F|BALANCE\\s*C/?F|B/?F\\s*BALANCE|C/?F\\s*BALANCE|SELF\\s*TRANSFER|INTERNAL\\s*TRANSFER|OWN\\s*ACCOUNT|TRANSACTION\\s+TOTAL",
    treatment: "IGNORE",
    categoryKey: "IGNORE",
    priority: 1,
    label: "Opening/closing/internal transfer",
  },
];

export const NW_PROFIT_RULES: DefaultProfitRule[] = [
  {
    matchPattern: "SANA\\s*LIFE|SANA.?LIFE",
    classification: "REVENUE",
    treatment: "REVENUE",
    categoryKey: "REVENUE",
    priority: 5,
    label: "Sana Life Science credit",
    direction: "credit",
  },
  {
    matchPattern: "SKYDOTEC",
    classification: "REVENUE",
    treatment: "REVENUE",
    categoryKey: "REVENUE",
    priority: 5,
    label: "Skydotec credit",
    direction: "credit",
  },
  {
    matchPattern: "OVERTIME|\\bOT\\b",
    classification: "OVERTIME",
    treatment: "BUSINESS_EXPENSE",
    categoryKey: "OVERTIME",
    priority: 8,
    label: "Overtime",
    direction: "debit",
  },
  {
    // Axis bulk salary payouts: NEFT/EB/AXOEB… (do not use bare HARDIK — matches HARDIKKUMAR).
    matchPattern: "NEFT/EB/",
    classification: "SALARY",
    treatment: "BUSINESS_EXPENSE",
    categoryKey: "SALARY",
    priority: 10,
    label: "Bank-paid employee salary",
    direction: "debit",
  },
  {
    matchPattern: "(?<![A-Z])SALARY(?![A-Z])|/SALARY",
    classification: "SALARY",
    treatment: "BUSINESS_EXPENSE",
    categoryKey: "SALARY",
    priority: 11,
    label: "Salary narration",
    direction: "debit",
  },
  {
    matchPattern: "CBDT|TDS|BUSINESS\\s*TAX|INTERNET\\s*TAX|TAX\\s*PAYMENT",
    classification: "TAX",
    treatment: "BUSINESS_EXPENSE",
    categoryKey: "CBDT_TAX",
    priority: 15,
    label: "CBDT / business tax",
    direction: "debit",
  },
  ...SHARED_PROFIT_RULES,
];

export const NQ_PROFIT_RULES: DefaultProfitRule[] = [
  {
    matchPattern: "SANA\\s*LIFE|SANA.?LIFE",
    classification: "REVENUE",
    treatment: "REVENUE",
    categoryKey: "REVENUE",
    priority: 5,
    label: "Sana Life Science credit",
    direction: "credit",
  },
  {
    matchPattern: "OVERTIME|\\bOT\\b",
    classification: "OVERTIME",
    treatment: "BUSINESS_EXPENSE",
    categoryKey: "OVERTIME",
    priority: 8,
    label: "Overtime",
    direction: "debit",
  },
  {
    matchPattern: "NEFT/EB/",
    classification: "SALARY",
    treatment: "BUSINESS_EXPENSE",
    categoryKey: "SALARY",
    priority: 10,
    label: "Bank-paid employee salary",
    direction: "debit",
  },
  {
    matchPattern: "(?<![A-Z])SALARY(?![A-Z])|/SALARY",
    classification: "SALARY",
    treatment: "BUSINESS_EXPENSE",
    categoryKey: "SALARY",
    priority: 11,
    label: "Salary narration",
    direction: "debit",
  },
  {
    matchPattern: "HIREN",
    treatment: "BUSINESS_EXPENSE",
    categoryKey: "BUSINESS_EXPENSE",
    priority: 15,
    label: "Hiren payment",
    direction: "debit",
  },
  {
    matchPattern: "PARTH",
    treatment: "BUSINESS_EXPENSE",
    categoryKey: "BUSINESS_EXPENSE",
    priority: 15,
    label: "Parth payment",
    direction: "debit",
  },
  {
    matchPattern: "CBDT|TDS|BUSINESS\\s*TAX|INTERNET\\s*TAX|TAX\\s*PAYMENT",
    classification: "TAX",
    treatment: "BUSINESS_EXPENSE",
    categoryKey: "CBDT_TAX",
    priority: 15,
    label: "CBDT / business tax",
    direction: "debit",
  },
  ...SHARED_PROFIT_RULES,
];

/** Fallback rules when company prefix is unknown. */
export const GENERIC_PROFIT_RULES: DefaultProfitRule[] = [
  ...NW_PROFIT_RULES.filter((r) => !r.matchPattern.includes("SKYDOTEC")),
];

export function defaultProfitRulesForPrefix(prefix: string): DefaultProfitRule[] {
  const p = prefix.toUpperCase();
  if (p === "NW") return NW_PROFIT_RULES;
  if (p === "NQ") return NQ_PROFIT_RULES;
  return GENERIC_PROFIT_RULES;
}

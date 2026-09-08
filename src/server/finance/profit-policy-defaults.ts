import type { ProfitTreatment, TransactionClassification } from "@prisma/client";
import type { ProfitCategoryKey } from "@/server/finance/profit-categories";

export type DefaultProfitRule = {
  matchPattern: string;
  classification?: TransactionClassification;
  treatment: ProfitTreatment;
  categoryKey: ProfitCategoryKey;
  priority: number;
  label: string;
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
  },
  {
    matchPattern: "BAJAJ",
    classification: "LOAN_EMI",
    treatment: "FINANCING_OR_PERSONAL",
    categoryKey: "BAJAJ_EMI",
    priority: 20,
    label: "Bajaj EMI",
  },
  {
    matchPattern: "CREDIT\\s*CARD|CC\\s*PAYMENT|CREDIT.?CARD",
    classification: "CREDIT_CARD",
    treatment: "FINANCING_OR_PERSONAL",
    categoryKey: "CREDIT_CARD",
    priority: 20,
    label: "Credit-card payment",
  },
  {
    matchPattern: "\\bLOVE\\b|SHIVANI",
    classification: "OWNER_TRANSFER",
    treatment: "OWNER_EXCLUDED",
    categoryKey: "OWNER_TRANSFER",
    priority: 25,
    label: "Love / owner transfer",
  },
  {
    matchPattern: "THREADS",
    treatment: "FINANCING_OR_PERSONAL",
    categoryKey: "OTHER_OUTFLOW",
    priority: 25,
    label: "Threads cheque",
  },
  {
    matchPattern:
      "OPENING|CLOSING|BALANCE\\s*B/?F|BALANCE\\s*C/?F|B/?F\\s*BALANCE|C/?F\\s*BALANCE|SELF\\s*TRANSFER|INTERNAL\\s*TRANSFER|OWN\\s*ACCOUNT",
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
  },
  {
    matchPattern: "SKYDOTEC",
    classification: "REVENUE",
    treatment: "REVENUE",
    categoryKey: "REVENUE",
    priority: 5,
    label: "Skydotec credit",
  },
  {
    matchPattern: "SALARY|OVERTIME|OT\\b",
    classification: "SALARY",
    treatment: "BUSINESS_EXPENSE",
    categoryKey: "SALARY_OVERTIME",
    priority: 10,
    label: "Employee salary and overtime",
  },
  {
    matchPattern: "OVERTIME|\\bOT\\b",
    classification: "OVERTIME",
    treatment: "BUSINESS_EXPENSE",
    categoryKey: "SALARY_OVERTIME",
    priority: 10,
    label: "Overtime",
  },
  {
    matchPattern: "HARDIK",
    treatment: "BUSINESS_EXPENSE",
    categoryKey: "CASH_SALARY",
    priority: 8,
    label: "Hardik cash salary",
  },
  {
    matchPattern: "CBDT|TDS|BUSINESS\\s*TAX",
    classification: "TAX",
    treatment: "BUSINESS_EXPENSE",
    categoryKey: "CBDT_TAX",
    priority: 15,
    label: "CBDT / business tax",
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
  },
  {
    matchPattern: "SALARY|OVERTIME|OT\\b",
    classification: "SALARY",
    treatment: "BUSINESS_EXPENSE",
    categoryKey: "SALARY_OVERTIME",
    priority: 10,
    label: "Employee salary and overtime",
  },
  {
    matchPattern: "OVERTIME|\\bOT\\b",
    classification: "OVERTIME",
    treatment: "BUSINESS_EXPENSE",
    categoryKey: "SALARY_OVERTIME",
    priority: 10,
    label: "Overtime",
  },
  {
    matchPattern: "HIREN",
    treatment: "BUSINESS_EXPENSE",
    categoryKey: "BUSINESS_EXPENSE",
    priority: 15,
    label: "Hiren payment",
  },
  {
    matchPattern: "PARTH",
    treatment: "BUSINESS_EXPENSE",
    categoryKey: "BUSINESS_EXPENSE",
    priority: 15,
    label: "Parth payment",
  },
  {
    matchPattern: "CBDT|TDS|BUSINESS\\s*TAX",
    classification: "TAX",
    treatment: "BUSINESS_EXPENSE",
    categoryKey: "CBDT_TAX",
    priority: 15,
    label: "CBDT / business tax",
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

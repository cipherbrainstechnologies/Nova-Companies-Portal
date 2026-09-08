import type { ProfitTreatment, TransactionClassification } from "@prisma/client";

/**
 * Fine-grained profit reporting buckets.
 * Earned business profit uses only revenue + operating expense categories.
 * Personal / financing categories never alter earned operating profit.
 */
export type ProfitCategoryKey =
  | "REVENUE"
  | "SALARY_OVERTIME"
  | "CASH_SALARY"
  | "CBDT_TAX"
  | "BUSINESS_EXPENSE"
  | "HOME_LOAN"
  | "BAJAJ_EMI"
  | "CREDIT_CARD"
  | "OWNER_TRANSFER"
  | "OTHER_OUTFLOW"
  | "UNCLASSIFIED"
  | "IGNORE";

export const PROFIT_CATEGORY_LABELS: Record<ProfitCategoryKey, string> = {
  REVENUE: "Revenue",
  SALARY_OVERTIME: "Salaries / overtime",
  CASH_SALARY: "Salary-related cash payment",
  CBDT_TAX: "CBDT / business tax",
  BUSINESS_EXPENSE: "Business expense",
  HOME_LOAN: "Home loan",
  BAJAJ_EMI: "Bajaj EMI",
  CREDIT_CARD: "Credit-card payment",
  OWNER_TRANSFER: "Owner / Love transfer",
  OTHER_OUTFLOW: "Other identified outflow",
  UNCLASSIFIED: "Unclassified / needs review",
  IGNORE: "Ignored (balance / internal)",
};

export function treatmentForCategory(categoryKey: ProfitCategoryKey): ProfitTreatment {
  switch (categoryKey) {
    case "REVENUE":
      return "REVENUE";
    case "SALARY_OVERTIME":
    case "CASH_SALARY":
    case "CBDT_TAX":
    case "BUSINESS_EXPENSE":
      return "BUSINESS_EXPENSE";
    case "HOME_LOAN":
    case "BAJAJ_EMI":
    case "CREDIT_CARD":
    case "OTHER_OUTFLOW":
      return "FINANCING_OR_PERSONAL";
    case "OWNER_TRANSFER":
      return "OWNER_EXCLUDED";
    case "UNCLASSIFIED":
    case "IGNORE":
      return "IGNORE";
  }
}

/** Manual classification always wins over narration rules. */
export function categoryFromManualClassification(
  classification: TransactionClassification,
  particulars: string,
): ProfitCategoryKey | null {
  const upper = particulars.toUpperCase();
  switch (classification) {
    case "REVENUE":
      return "REVENUE";
    case "SALARY":
    case "OVERTIME":
      return "SALARY_OVERTIME";
    case "TAX":
      return "CBDT_TAX";
    case "CREDIT_CARD":
      return "CREDIT_CARD";
    case "OWNER_TRANSFER":
      return "OWNER_TRANSFER";
    case "LOAN_EMI":
      if (/BAJAJ/.test(upper)) return "BAJAJ_EMI";
      if (/HOME\s*LOAN|HOME.?LOAN/.test(upper)) return "HOME_LOAN";
      return "HOME_LOAN";
    case "IGNORE":
      return "IGNORE";
    case "CASH_WITHDRAWAL":
      if (/HARDIK/.test(upper)) return "CASH_SALARY";
      return "OTHER_OUTFLOW";
    case "EXPENSE":
    case "REIMBURSEMENT":
    case "PF_ESI":
    case "CONTRACTOR":
      if (/HARDIK/.test(upper)) return "CASH_SALARY";
      if (/HIREN|PARTH/.test(upper)) return "BUSINESS_EXPENSE";
      if (/CBDT|TDS/.test(upper)) return "CBDT_TAX";
      return "BUSINESS_EXPENSE";
    case "UNCLASSIFIED":
      return null;
    default:
      return null;
  }
}

export function isEarnedProfitExpenseCategory(key: ProfitCategoryKey): boolean {
  return (
    key === "SALARY_OVERTIME" ||
    key === "CASH_SALARY" ||
    key === "CBDT_TAX" ||
    key === "BUSINESS_EXPENSE"
  );
}

export function isPersonalFinanceCategory(key: ProfitCategoryKey): boolean {
  return (
    key === "HOME_LOAN" ||
    key === "BAJAJ_EMI" ||
    key === "CREDIT_CARD" ||
    key === "OWNER_TRANSFER" ||
    key === "OTHER_OUTFLOW"
  );
}

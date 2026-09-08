import type { ProfitTreatment, TransactionClassification } from "@prisma/client";

/**
 * Fine-grained finance treatment for reporting.
 * Distinct from Prisma ProfitTreatment (rollup for snapshots).
 */
export type FinanceTreatment =
  | "REVENUE"
  | "SALARY"
  | "OVERTIME"
  | "SALARY_RELATED_CASH"
  | "CBDT_BUSINESS_TAX"
  | "OTHER_BUSINESS_EXPENSE"
  | "PERSONAL_FINANCING"
  | "OWNER_TRANSFER"
  | "UNCLASSIFIED"
  | "IGNORE";

/**
 * Stored policy / line category keys (DB `categoryKey` + UI labels).
 */
export type ProfitCategoryKey =
  | "REVENUE"
  | "SALARY"
  | "OVERTIME"
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
  SALARY: "Bank-paid salaries",
  OVERTIME: "Overtime",
  SALARY_OVERTIME: "Salaries / overtime",
  CASH_SALARY: "Salary-related cash payment",
  CBDT_TAX: "CBDT / business tax",
  BUSINESS_EXPENSE: "Other business expense",
  HOME_LOAN: "Home loan",
  BAJAJ_EMI: "Bajaj EMI",
  CREDIT_CARD: "Credit-card payment",
  OWNER_TRANSFER: "Owner / Love transfer",
  OTHER_OUTFLOW: "Other identified outflow",
  UNCLASSIFIED: "Unclassified / needs review",
  IGNORE: "Ignored (balance / internal)",
};

export function financeTreatmentForCategory(categoryKey: ProfitCategoryKey): FinanceTreatment {
  switch (categoryKey) {
    case "REVENUE":
      return "REVENUE";
    case "SALARY":
    case "SALARY_OVERTIME":
      return "SALARY";
    case "OVERTIME":
      return "OVERTIME";
    case "CASH_SALARY":
      return "SALARY_RELATED_CASH";
    case "CBDT_TAX":
      return "CBDT_BUSINESS_TAX";
    case "BUSINESS_EXPENSE":
      return "OTHER_BUSINESS_EXPENSE";
    case "HOME_LOAN":
    case "BAJAJ_EMI":
    case "CREDIT_CARD":
    case "OTHER_OUTFLOW":
      return "PERSONAL_FINANCING";
    case "OWNER_TRANSFER":
      return "OWNER_TRANSFER";
    case "IGNORE":
      return "IGNORE";
    case "UNCLASSIFIED":
      return "UNCLASSIFIED";
  }
}

export function treatmentForCategory(categoryKey: ProfitCategoryKey): ProfitTreatment {
  switch (financeTreatmentForCategory(categoryKey)) {
    case "REVENUE":
      return "REVENUE";
    case "SALARY":
    case "OVERTIME":
    case "SALARY_RELATED_CASH":
    case "CBDT_BUSINESS_TAX":
    case "OTHER_BUSINESS_EXPENSE":
      return "BUSINESS_EXPENSE";
    case "PERSONAL_FINANCING":
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
      return "SALARY";
    case "OVERTIME":
      return "OVERTIME";
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
      return "UNCLASSIFIED";
    case "EXPENSE":
    case "REIMBURSEMENT":
    case "PF_ESI":
    case "CONTRACTOR":
      if (/HIREN|PARTH/.test(upper)) return "BUSINESS_EXPENSE";
      if (/CBDT|TDS|INTERNET\s*TAX/.test(upper)) return "CBDT_TAX";
      return "BUSINESS_EXPENSE";
    case "UNCLASSIFIED":
      return null;
    default:
      return null;
  }
}

/** Categories that reduce earned operating profit. */
export function isEarnedProfitExpenseCategory(key: ProfitCategoryKey): boolean {
  return (
    key === "SALARY" ||
    key === "OVERTIME" ||
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

export function isSalaryCategory(key: ProfitCategoryKey): boolean {
  return key === "SALARY" || key === "SALARY_OVERTIME";
}

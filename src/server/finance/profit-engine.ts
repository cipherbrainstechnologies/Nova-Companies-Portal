import { prisma } from "@/server/db";
import type { ProfitTreatment, TransactionClassification } from "@prisma/client";

export type ProfitBreakdown = {
  revenue: number;
  businessExpenses: number;
  earnedOperatingProfit: number;
  ownerFinancingOutgoings: number;
  cashRemaining: number;
  /** Explicitly not profit — do not present as earned profit. */
  bankBalanceLabelForbidden: true;
};

const DEFAULT_RULES: Array<{
  matchPattern: string;
  classification?: TransactionClassification;
  treatment: ProfitTreatment;
  priority: number;
}> = [
  { matchPattern: "SALARY|OVERTIME", classification: "SALARY", treatment: "BUSINESS_EXPENSE", priority: 10 },
  { matchPattern: "OVERTIME", classification: "OVERTIME", treatment: "BUSINESS_EXPENSE", priority: 10 },
  { matchPattern: "HIREN", treatment: "BUSINESS_EXPENSE", priority: 20 },
  { matchPattern: "PARTH", treatment: "BUSINESS_EXPENSE", priority: 20 },
  { matchPattern: "HARDIK", treatment: "BUSINESS_EXPENSE", priority: 20 },
  { matchPattern: "CBDT|TDS", classification: "TAX", treatment: "BUSINESS_EXPENSE", priority: 15 },
  { matchPattern: "HOME.?LOAN|BAJAJ|EMI", classification: "LOAN_EMI", treatment: "FINANCING_OR_PERSONAL", priority: 20 },
  { matchPattern: "CREDIT.?CARD|CC PAYMENT", classification: "CREDIT_CARD", treatment: "FINANCING_OR_PERSONAL", priority: 20 },
  { matchPattern: "LOVE|SHIVANI", classification: "OWNER_TRANSFER", treatment: "OWNER_EXCLUDED", priority: 5 },
];

export async function seedDefaultProfitPolicies(companyId: string) {
  for (const rule of DEFAULT_RULES) {
    const existing = await prisma.profitPolicyRule.findFirst({
      where: { companyId, matchPattern: rule.matchPattern },
    });
    if (!existing) {
      await prisma.profitPolicyRule.create({
        data: {
          companyId,
          matchPattern: rule.matchPattern,
          classification: rule.classification,
          treatment: rule.treatment,
          priority: rule.priority,
        },
      });
    }
  }
}

function matchTreatment(
  particulars: string,
  classification: TransactionClassification,
  rules: Array<{ matchPattern: string; classification: TransactionClassification | null; treatment: ProfitTreatment; priority: number }>,
): ProfitTreatment {
  const upper = particulars.toUpperCase();
  const sorted = [...rules].sort((a, b) => a.priority - b.priority);
  for (const rule of sorted) {
    if (rule.classification && rule.classification === classification) return rule.treatment;
    try {
      if (new RegExp(rule.matchPattern, "i").test(upper)) return rule.treatment;
    } catch {
      if (upper.includes(rule.matchPattern.toUpperCase())) return rule.treatment;
    }
  }
  if (classification === "REVENUE") return "REVENUE";
  if (classification === "IGNORE") return "IGNORE";
  return "BUSINESS_EXPENSE";
}

export async function computeMonthlyProfit(input: {
  companyId: string;
  year: number;
  month: number;
}): Promise<ProfitBreakdown> {
  const start = new Date(Date.UTC(input.year, input.month - 1, 1));
  const end = new Date(Date.UTC(input.year, input.month, 1));
  const rules = await prisma.profitPolicyRule.findMany({
    where: { companyId: input.companyId, isActive: true },
  });

  const statements = await prisma.bankStatement.findMany({
    where: { companyId: input.companyId },
    include: {
      transactions: {
        where: { txnDate: { gte: start, lt: end } },
      },
    },
  });

  let revenue = 0;
  let businessExpenses = 0;
  let ownerFinancingOutgoings = 0;

  for (const st of statements) {
    for (const txn of st.transactions) {
      const treatment = matchTreatment(txn.particulars, txn.classification, rules);
      const debit = txn.debit ? Number(txn.debit) : 0;
      const credit = txn.credit ? Number(txn.credit) : 0;
      if (treatment === "REVENUE" || credit > 0 && txn.classification === "REVENUE") {
        revenue += credit;
        continue;
      }
      if (treatment === "IGNORE") continue;
      if (treatment === "BUSINESS_EXPENSE") businessExpenses += debit;
      if (treatment === "FINANCING_OR_PERSONAL" || treatment === "OWNER_EXCLUDED") {
        ownerFinancingOutgoings += debit;
      }
    }
  }

  const earnedOperatingProfit = revenue - businessExpenses;
  const cashRemaining = earnedOperatingProfit - ownerFinancingOutgoings;

  await prisma.profitReportSnapshot.upsert({
    where: {
      companyId_year_month: {
        companyId: input.companyId,
        year: input.year,
        month: input.month,
      },
    },
    create: {
      companyId: input.companyId,
      year: input.year,
      month: input.month,
      revenue,
      businessExpenses,
      earnedOperatingProfit,
      ownerFinancingOutgoings,
      cashRemaining,
    },
    update: {
      revenue,
      businessExpenses,
      earnedOperatingProfit,
      ownerFinancingOutgoings,
      cashRemaining,
    },
  });

  return {
    revenue,
    businessExpenses,
    earnedOperatingProfit,
    ownerFinancingOutgoings,
    cashRemaining,
    bankBalanceLabelForbidden: true,
  };
}

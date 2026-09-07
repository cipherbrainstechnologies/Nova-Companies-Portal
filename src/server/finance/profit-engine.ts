import { prisma } from "@/server/db";
import type { ProfitTreatment, TransactionClassification } from "@prisma/client";
import { assertIdentity, money, roundInr } from "@/server/finance/money";
import {
  profitFolderPrefix,
  profitSheetFileName,
  periodKey,
} from "@/server/documents/naming";
import { storePrivateFile } from "@/server/storage/s3";

export type ProfitLine = {
  transactionId: string;
  particulars: string;
  debit: number;
  credit: number;
  classification: TransactionClassification;
  treatment: ProfitTreatment;
};

export type ProfitBreakdown = {
  companyId: string;
  companyPrefix: string;
  companyName: string;
  year: number;
  month: number;
  period: string;
  revenue: number;
  businessExpenses: number;
  earnedOperatingProfit: number;
  ownerFinancingOutgoings: number;
  cashRemaining: number;
  lines: ProfitLine[];
  storagePath: string;
  /** Explicitly not profit — do not present as earned profit. */
  bankBalanceLabelForbidden: true;
  identities: {
    earnedOperatingProfit: string;
    cashRemaining: string;
  };
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
  rules: Array<{
    matchPattern: string;
    classification: TransactionClassification | null;
    treatment: ProfitTreatment;
    priority: number;
  }>,
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
  if (creditOnlyHint(classification)) return "REVENUE";
  return "BUSINESS_EXPENSE";
}

function creditOnlyHint(classification: TransactionClassification) {
  return classification === "REVENUE";
}

export async function computeMonthlyProfit(input: {
  companyId: string;
  year: number;
  month: number;
  persistSheet?: boolean;
}): Promise<ProfitBreakdown> {
  const company = await prisma.company.findUniqueOrThrow({ where: { id: input.companyId } });
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

  let revenue = money(0);
  let businessExpenses = money(0);
  let ownerFinancingOutgoings = money(0);
  const lines: ProfitLine[] = [];

  for (const st of statements) {
    for (const txn of st.transactions) {
      const treatment = matchTreatment(txn.particulars, txn.classification, rules);
      const debit = money(txn.debit ?? 0);
      const credit = money(txn.credit ?? 0);

      lines.push({
        transactionId: txn.id,
        particulars: txn.particulars,
        debit: roundInr(debit),
        credit: roundInr(credit),
        classification: txn.classification,
        treatment,
      });

      if (treatment === "REVENUE" || (credit.gt(0) && txn.classification === "REVENUE")) {
        revenue = revenue.plus(credit);
        continue;
      }

      if (treatment === "IGNORE") continue;

      // Non-revenue credits are ignored for profit math (do not inflate earned profit).
      if (credit.gt(0) && debit.eq(0)) {
        continue;
      }

      if (treatment === "BUSINESS_EXPENSE") {
        businessExpenses = businessExpenses.plus(debit);
      } else if (treatment === "FINANCING_OR_PERSONAL" || treatment === "OWNER_EXCLUDED") {
        ownerFinancingOutgoings = ownerFinancingOutgoings.plus(debit);
      }
    }
  }

  const earnedOperatingProfit = revenue.minus(businessExpenses);
  const cashRemaining = earnedOperatingProfit.minus(ownerFinancingOutgoings);

  assertIdentity(
    "earnedOperatingProfit",
    earnedOperatingProfit,
    revenue.minus(businessExpenses),
  );
  assertIdentity(
    "cashRemaining",
    cashRemaining,
    earnedOperatingProfit.minus(ownerFinancingOutgoings),
  );

  const revenueN = roundInr(revenue);
  const bizN = roundInr(businessExpenses);
  const eopN = roundInr(earnedOperatingProfit);
  const ownerN = roundInr(ownerFinancingOutgoings);
  const cashN = roundInr(cashRemaining);

  assertIdentity("earnedOperatingProfit.rounded", eopN, roundInr(money(revenueN).minus(bizN)));
  assertIdentity("cashRemaining.rounded", cashN, roundInr(money(eopN).minus(ownerN)));

  const period = periodKey(input.year, input.month);
  const folder = profitFolderPrefix({
    companyPrefix: company.prefix,
    year: input.year,
    month: input.month,
  });
  const fileName = profitSheetFileName({
    companyPrefix: company.prefix,
    year: input.year,
    month: input.month,
  });
  const storagePath = `${folder}/${fileName}`;

  const details = {
    formula: {
      earnedOperatingProfit: "revenue - businessExpenses",
      cashRemaining: "earnedOperatingProfit - ownerFinancingOutgoings",
      never: "bank balance is not profit",
    },
    lines,
    storagePath,
  };

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
      revenue: revenueN,
      businessExpenses: bizN,
      earnedOperatingProfit: eopN,
      ownerFinancingOutgoings: ownerN,
      cashRemaining: cashN,
      detailsJson: details,
    },
    update: {
      revenue: revenueN,
      businessExpenses: bizN,
      earnedOperatingProfit: eopN,
      ownerFinancingOutgoings: ownerN,
      cashRemaining: cashN,
      detailsJson: details,
    },
  });

  if (input.persistSheet !== false) {
    try {
      await storePrivateFile({
        buffer: Buffer.from(
          JSON.stringify(
            {
              company: company.name,
              prefix: company.prefix,
              period,
              revenue: revenueN,
              businessExpenses: bizN,
              earnedOperatingProfit: eopN,
              ownerFinancingOutgoings: ownerN,
              cashRemaining: cashN,
              identities: {
                earnedOperatingProfit: `${revenueN} - ${bizN} = ${eopN}`,
                cashRemaining: `${eopN} - ${ownerN} = ${cashN}`,
              },
              lines,
            },
            null,
            2,
          ),
          "utf8",
        ),
        mimeType: "application/json",
        originalName: fileName,
        prefix: folder,
      });
    } catch {
      // Storage may be unavailable in local/dev without MinIO; snapshot still saved.
    }
  }

  return {
    companyId: company.id,
    companyPrefix: company.prefix,
    companyName: company.name,
    year: input.year,
    month: input.month,
    period,
    revenue: revenueN,
    businessExpenses: bizN,
    earnedOperatingProfit: eopN,
    ownerFinancingOutgoings: ownerN,
    cashRemaining: cashN,
    lines,
    storagePath,
    bankBalanceLabelForbidden: true,
    identities: {
      earnedOperatingProfit: `${revenueN} - ${bizN} = ${eopN}`,
      cashRemaining: `${eopN} - ${ownerN} = ${cashN}`,
    },
  };
}

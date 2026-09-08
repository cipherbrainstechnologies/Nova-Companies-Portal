import { prisma } from "@/server/db";
import type { ProfitTreatment, TransactionClassification } from "@prisma/client";
import { assertIdentity, money, roundInr } from "@/server/finance/money";
import {
  profitFolderPrefix,
  profitSheetFileName,
  periodKey,
} from "@/server/documents/naming";
import { storePrivateFile } from "@/server/storage/s3";
import {
  categoryFromManualClassification,
  isEarnedProfitExpenseCategory,
  isPersonalFinanceCategory,
  PROFIT_CATEGORY_LABELS,
  treatmentForCategory,
  type ProfitCategoryKey,
} from "@/server/finance/profit-categories";
import {
  defaultProfitRulesForPrefix,
  type DefaultProfitRule,
} from "@/server/finance/profit-policy-defaults";

export type ProfitPolicyRuleInput = {
  matchPattern: string;
  classification: TransactionClassification | null;
  treatment: ProfitTreatment;
  categoryKey: ProfitCategoryKey;
  priority: number;
  label?: string | null;
};

export type ProfitLineInput = {
  transactionId?: string;
  particulars: string;
  debit: number;
  credit: number;
  classification: TransactionClassification;
};

export type ProfitLine = ProfitLineInput & {
  transactionId: string;
  treatment: ProfitTreatment;
  categoryKey: ProfitCategoryKey;
  categoryLabel: string;
  matchedBy: "manual_classification" | "narration_rule" | "default";
};

export type PersonalFinanceBreakdown = {
  homeLoan: number;
  bajajEmi: number;
  creditCard: number;
  ownerTransfers: number;
  otherOutflows: number;
  /** Home loan + Bajaj + credit card only (cash remaining ladder step 1). */
  corePersonalFinance: number;
  /** Owner transfers + other identified outflows (ladder step 2). */
  otherPersonalOutgoings: number;
  total: number;
};

export type UnclassifiedBucket = {
  count: number;
  totalDebit: number;
  totalCredit: number;
  lines: ProfitLine[];
};

export type ProfitSummary = {
  revenue: number;
  salariesOvertime: number;
  cashSalaryPayments: number;
  cbdtTax: number;
  otherBusinessExpenses: number;
  businessExpenses: number;
  earnedOperatingProfit: number;
  personalFinancing: PersonalFinanceBreakdown;
  /** Combined earned − home loan − Bajaj − credit card. */
  profitAfterPersonalFinance: number;
  /** After personal finance − Love transfers − Threads / other outflows. */
  cashRemainingAfterDeductions: number;
  /** Alias kept for snapshots / legacy UI. */
  ownerFinancingOutgoings: number;
  cashRemaining: number;
  unclassified: UnclassifiedBucket;
  lines: ProfitLine[];
  identities: {
    earnedOperatingProfit: string;
    profitAfterPersonalFinance: string;
    cashRemainingAfterDeductions: string;
  };
};

export type ProfitBreakdown = ProfitSummary & {
  companyId: string;
  companyPrefix: string;
  companyName: string;
  year: number;
  month: number;
  period: string;
  storagePath: string;
  bankBalanceLabelForbidden: true;
};

function patternMatches(pattern: string, upperParticulars: string): boolean {
  try {
    return new RegExp(pattern, "i").test(upperParticulars);
  } catch {
    return upperParticulars.includes(pattern.toUpperCase());
  }
}

export function resolveProfitAssignment(
  particulars: string,
  classification: TransactionClassification,
  rules: ProfitPolicyRuleInput[],
): Pick<ProfitLine, "treatment" | "categoryKey" | "matchedBy"> {
  const manual = categoryFromManualClassification(classification, particulars);
  if (manual) {
    return {
      categoryKey: manual,
      treatment: treatmentForCategory(manual),
      matchedBy: "manual_classification",
    };
  }

  const upper = particulars.toUpperCase();
  const sorted = [...rules].sort((a, b) => a.priority - b.priority);
  for (const rule of sorted) {
    if (patternMatches(rule.matchPattern, upper)) {
      const categoryKey = rule.categoryKey ?? categoryFromTreatment(rule.treatment);
      return {
        categoryKey,
        treatment: rule.treatment,
        matchedBy: "narration_rule",
      };
    }
  }

  return {
    categoryKey: "UNCLASSIFIED",
    treatment: "IGNORE",
    matchedBy: "default",
  };
}

function categoryFromTreatment(treatment: ProfitTreatment): ProfitCategoryKey {
  switch (treatment) {
    case "REVENUE":
      return "REVENUE";
    case "BUSINESS_EXPENSE":
      return "BUSINESS_EXPENSE";
    case "FINANCING_OR_PERSONAL":
      return "OTHER_OUTFLOW";
    case "OWNER_EXCLUDED":
      return "OWNER_TRANSFER";
    case "IGNORE":
      return "IGNORE";
  }
}

/**
 * Pure earned-profit summarizer. Fixtures and unit tests call this directly —
 * never hard-code verified report totals into the engine.
 */
export function summarizeEarnedProfit(
  inputs: ProfitLineInput[],
  rules: ProfitPolicyRuleInput[],
): ProfitSummary {
  let revenue = money(0);
  let salariesOvertime = money(0);
  let cashSalaryPayments = money(0);
  let cbdtTax = money(0);
  let otherBusinessExpenses = money(0);
  const personal = {
    homeLoan: money(0),
    bajajEmi: money(0),
    creditCard: money(0),
    ownerTransfers: money(0),
    otherOutflows: money(0),
  };
  const lines: ProfitLine[] = [];
  const unclassifiedLines: ProfitLine[] = [];
  let unclassifiedDebit = money(0);
  let unclassifiedCredit = money(0);

  for (const input of inputs) {
    const assignment = resolveProfitAssignment(input.particulars, input.classification, rules);
    const debit = money(input.debit ?? 0);
    const credit = money(input.credit ?? 0);
    const line: ProfitLine = {
      transactionId: input.transactionId ?? "",
      particulars: input.particulars,
      debit: roundInr(debit),
      credit: roundInr(credit),
      classification: input.classification,
      treatment: assignment.treatment,
      categoryKey: assignment.categoryKey,
      categoryLabel: PROFIT_CATEGORY_LABELS[assignment.categoryKey],
      matchedBy: assignment.matchedBy,
    };
    lines.push(line);

    if (assignment.categoryKey === "UNCLASSIFIED") {
      unclassifiedLines.push(line);
      unclassifiedDebit = unclassifiedDebit.plus(debit);
      unclassifiedCredit = unclassifiedCredit.plus(credit);
      continue;
    }

    if (assignment.categoryKey === "IGNORE" || assignment.treatment === "IGNORE") {
      continue;
    }

    if (assignment.categoryKey === "REVENUE" || assignment.treatment === "REVENUE") {
      revenue = revenue.plus(credit);
      continue;
    }

    // Non-revenue credits never inflate earned profit.
    if (credit.gt(0) && debit.eq(0)) {
      continue;
    }

    if (isEarnedProfitExpenseCategory(assignment.categoryKey)) {
      switch (assignment.categoryKey) {
        case "SALARY_OVERTIME":
          salariesOvertime = salariesOvertime.plus(debit);
          break;
        case "CASH_SALARY":
          cashSalaryPayments = cashSalaryPayments.plus(debit);
          break;
        case "CBDT_TAX":
          cbdtTax = cbdtTax.plus(debit);
          break;
        default:
          otherBusinessExpenses = otherBusinessExpenses.plus(debit);
          break;
      }
      continue;
    }

    if (isPersonalFinanceCategory(assignment.categoryKey)) {
      switch (assignment.categoryKey) {
        case "HOME_LOAN":
          personal.homeLoan = personal.homeLoan.plus(debit);
          break;
        case "BAJAJ_EMI":
          personal.bajajEmi = personal.bajajEmi.plus(debit);
          break;
        case "CREDIT_CARD":
          personal.creditCard = personal.creditCard.plus(debit);
          break;
        case "OWNER_TRANSFER":
          personal.ownerTransfers = personal.ownerTransfers.plus(debit);
          break;
        default:
          personal.otherOutflows = personal.otherOutflows.plus(debit);
          break;
      }
    }
  }

  const businessExpenses = salariesOvertime
    .plus(cashSalaryPayments)
    .plus(cbdtTax)
    .plus(otherBusinessExpenses);
  const earnedOperatingProfit = revenue.minus(businessExpenses);
  const corePersonalFinance = personal.homeLoan.plus(personal.bajajEmi).plus(personal.creditCard);
  const otherPersonalOutgoings = personal.ownerTransfers.plus(personal.otherOutflows);
  const ownerFinancingOutgoings = corePersonalFinance.plus(otherPersonalOutgoings);
  const profitAfterPersonalFinance = earnedOperatingProfit.minus(corePersonalFinance);
  const cashRemainingAfterDeductions = profitAfterPersonalFinance.minus(otherPersonalOutgoings);

  assertIdentity(
    "earnedOperatingProfit",
    earnedOperatingProfit,
    revenue.minus(businessExpenses),
  );
  assertIdentity(
    "profitAfterPersonalFinance",
    profitAfterPersonalFinance,
    earnedOperatingProfit.minus(corePersonalFinance),
  );
  assertIdentity(
    "cashRemainingAfterDeductions",
    cashRemainingAfterDeductions,
    profitAfterPersonalFinance.minus(otherPersonalOutgoings),
  );

  const revenueN = roundInr(revenue);
  const salariesN = roundInr(salariesOvertime);
  const cashSalaryN = roundInr(cashSalaryPayments);
  const cbdtN = roundInr(cbdtTax);
  const otherBizN = roundInr(otherBusinessExpenses);
  const bizN = roundInr(businessExpenses);
  const eopN = roundInr(earnedOperatingProfit);
  const homeN = roundInr(personal.homeLoan);
  const bajajN = roundInr(personal.bajajEmi);
  const ccN = roundInr(personal.creditCard);
  const loveN = roundInr(personal.ownerTransfers);
  const otherOutN = roundInr(personal.otherOutflows);
  const coreN = roundInr(corePersonalFinance);
  const otherPersN = roundInr(otherPersonalOutgoings);
  const ownerN = roundInr(ownerFinancingOutgoings);
  const afterPersN = roundInr(profitAfterPersonalFinance);
  const cashN = roundInr(cashRemainingAfterDeductions);

  return {
    revenue: revenueN,
    salariesOvertime: salariesN,
    cashSalaryPayments: cashSalaryN,
    cbdtTax: cbdtN,
    otherBusinessExpenses: otherBizN,
    businessExpenses: bizN,
    earnedOperatingProfit: eopN,
    personalFinancing: {
      homeLoan: homeN,
      bajajEmi: bajajN,
      creditCard: ccN,
      ownerTransfers: loveN,
      otherOutflows: otherOutN,
      corePersonalFinance: coreN,
      otherPersonalOutgoings: otherPersN,
      total: ownerN,
    },
    profitAfterPersonalFinance: afterPersN,
    cashRemainingAfterDeductions: cashN,
    ownerFinancingOutgoings: ownerN,
    cashRemaining: cashN,
    unclassified: {
      count: unclassifiedLines.length,
      totalDebit: roundInr(unclassifiedDebit),
      totalCredit: roundInr(unclassifiedCredit),
      lines: unclassifiedLines,
    },
    lines,
    identities: {
      earnedOperatingProfit: `${revenueN} − ${bizN} = ${eopN}`,
      profitAfterPersonalFinance: `${eopN} − ${coreN} = ${afterPersN}`,
      cashRemainingAfterDeductions: `${afterPersN} − ${otherPersN} = ${cashN}`,
    },
  };
}

/** Combine two company earned-profit summaries (personal buckets summed). */
export function combineProfitSummaries(a: ProfitSummary, b: ProfitSummary): ProfitSummary {
  // Do not re-run narration rules across companies — prefixes use different maps.
  const revenue = roundInr(money(a.revenue).plus(b.revenue));
  const salariesOvertime = roundInr(money(a.salariesOvertime).plus(b.salariesOvertime));
  const cashSalaryPayments = roundInr(money(a.cashSalaryPayments).plus(b.cashSalaryPayments));
  const cbdtTax = roundInr(money(a.cbdtTax).plus(b.cbdtTax));
  const otherBusinessExpenses = roundInr(
    money(a.otherBusinessExpenses).plus(b.otherBusinessExpenses),
  );
  const businessExpenses = roundInr(money(a.businessExpenses).plus(b.businessExpenses));
  const earnedOperatingProfit = roundInr(
    money(a.earnedOperatingProfit).plus(b.earnedOperatingProfit),
  );
  const homeLoan = roundInr(money(a.personalFinancing.homeLoan).plus(b.personalFinancing.homeLoan));
  const bajajEmi = roundInr(money(a.personalFinancing.bajajEmi).plus(b.personalFinancing.bajajEmi));
  const creditCard = roundInr(
    money(a.personalFinancing.creditCard).plus(b.personalFinancing.creditCard),
  );
  const ownerTransfers = roundInr(
    money(a.personalFinancing.ownerTransfers).plus(b.personalFinancing.ownerTransfers),
  );
  const otherOutflows = roundInr(
    money(a.personalFinancing.otherOutflows).plus(b.personalFinancing.otherOutflows),
  );
  const corePersonalFinance = roundInr(money(homeLoan).plus(bajajEmi).plus(creditCard));
  const otherPersonalOutgoings = roundInr(money(ownerTransfers).plus(otherOutflows));
  const ownerFinancingOutgoings = roundInr(
    money(corePersonalFinance).plus(otherPersonalOutgoings),
  );
  const profitAfterPersonalFinance = roundInr(
    money(earnedOperatingProfit).minus(corePersonalFinance),
  );
  const cashRemainingAfterDeductions = roundInr(
    money(profitAfterPersonalFinance).minus(otherPersonalOutgoings),
  );
  const lines = [...a.lines, ...b.lines];
  const unclassifiedLines = [...a.unclassified.lines, ...b.unclassified.lines];

  assertIdentity(
    "combined.earnedOperatingProfit",
    earnedOperatingProfit,
    money(a.earnedOperatingProfit).plus(b.earnedOperatingProfit),
  );

  return {
    revenue,
    salariesOvertime,
    cashSalaryPayments,
    cbdtTax,
    otherBusinessExpenses,
    businessExpenses,
    earnedOperatingProfit,
    personalFinancing: {
      homeLoan,
      bajajEmi,
      creditCard,
      ownerTransfers,
      otherOutflows,
      corePersonalFinance,
      otherPersonalOutgoings,
      total: ownerFinancingOutgoings,
    },
    profitAfterPersonalFinance,
    cashRemainingAfterDeductions,
    ownerFinancingOutgoings,
    cashRemaining: cashRemainingAfterDeductions,
    unclassified: {
      count: unclassifiedLines.length,
      totalDebit: roundInr(money(a.unclassified.totalDebit).plus(b.unclassified.totalDebit)),
      totalCredit: roundInr(money(a.unclassified.totalCredit).plus(b.unclassified.totalCredit)),
      lines: unclassifiedLines,
    },
    lines,
    identities: {
      earnedOperatingProfit: `${a.earnedOperatingProfit} + ${b.earnedOperatingProfit} = ${earnedOperatingProfit}`,
      profitAfterPersonalFinance: `${earnedOperatingProfit} − ${corePersonalFinance} = ${profitAfterPersonalFinance}`,
      cashRemainingAfterDeductions: `${profitAfterPersonalFinance} − ${otherPersonalOutgoings} = ${cashRemainingAfterDeductions}`,
    },
  };
}

function toPolicyInputs(rules: DefaultProfitRule[]): ProfitPolicyRuleInput[] {
  return rules.map((rule) => ({
    matchPattern: rule.matchPattern,
    classification: rule.classification ?? null,
    treatment: rule.treatment,
    categoryKey: rule.categoryKey,
    priority: rule.priority,
    label: rule.label,
  }));
}

export async function seedDefaultProfitPolicies(companyId: string, prefix?: string) {
  const company =
    prefix != null
      ? { prefix }
      : await prisma.company.findUniqueOrThrow({
          where: { id: companyId },
          select: { prefix: true },
        });
  const defaults = defaultProfitRulesForPrefix(company.prefix);

  for (const rule of defaults) {
    const existing = await prisma.profitPolicyRule.findFirst({
      where: { companyId, matchPattern: rule.matchPattern },
    });
    const data = {
      classification: rule.classification,
      treatment: rule.treatment,
      categoryKey: rule.categoryKey,
      label: rule.label,
      priority: rule.priority,
      isActive: true,
    };
    if (!existing) {
      await prisma.profitPolicyRule.create({
        data: {
          companyId,
          matchPattern: rule.matchPattern,
          ...data,
        },
      });
    } else {
      await prisma.profitPolicyRule.update({
        where: { id: existing.id },
        data,
      });
    }
  }
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

  const policyInputs: ProfitPolicyRuleInput[] =
    rules.length > 0
      ? rules.map((rule) => ({
          matchPattern: rule.matchPattern,
          classification: rule.classification,
          treatment: rule.treatment,
          categoryKey: (rule.categoryKey as ProfitCategoryKey | null) ?? categoryFromTreatment(rule.treatment),
          priority: rule.priority,
          label: rule.label,
        }))
      : toPolicyInputs(defaultProfitRulesForPrefix(company.prefix));

  const statements = await prisma.bankStatement.findMany({
    where: { companyId: input.companyId },
    include: {
      transactions: {
        where: { txnDate: { gte: start, lt: end } },
      },
    },
  });

  const inputs: ProfitLineInput[] = [];
  for (const st of statements) {
    for (const txn of st.transactions) {
      inputs.push({
        transactionId: txn.id,
        particulars: txn.particulars,
        debit: Number(txn.debit ?? 0),
        credit: Number(txn.credit ?? 0),
        classification: txn.classification,
      });
    }
  }

  const summary = summarizeEarnedProfit(inputs, policyInputs);

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
      earnedOperatingProfit:
        "Actual business credits − salaries − overtime − salary-related cash − CBDT/business tax − other business expenses",
      profitAfterPersonalFinance:
        "Earned operating profit − home loan − Bajaj EMI − credit-card payments",
      cashRemainingAfterDeductions:
        "Profit after personal/finance deductions − owner/Love transfers − other identified outflows",
      never: "Bank balance, opening/closing, internal transfers, and unclassified amounts are not earned profit",
    },
    breakdown: {
      revenue: summary.revenue,
      salariesOvertime: summary.salariesOvertime,
      cashSalaryPayments: summary.cashSalaryPayments,
      cbdtTax: summary.cbdtTax,
      otherBusinessExpenses: summary.otherBusinessExpenses,
      personalFinancing: summary.personalFinancing,
      unclassified: {
        count: summary.unclassified.count,
        totalDebit: summary.unclassified.totalDebit,
        totalCredit: summary.unclassified.totalCredit,
      },
    },
    lines: summary.lines,
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
      revenue: summary.revenue,
      businessExpenses: summary.businessExpenses,
      earnedOperatingProfit: summary.earnedOperatingProfit,
      ownerFinancingOutgoings: summary.ownerFinancingOutgoings,
      cashRemaining: summary.cashRemaining,
      detailsJson: details,
    },
    update: {
      revenue: summary.revenue,
      businessExpenses: summary.businessExpenses,
      earnedOperatingProfit: summary.earnedOperatingProfit,
      ownerFinancingOutgoings: summary.ownerFinancingOutgoings,
      cashRemaining: summary.cashRemaining,
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
              ...summary,
              identities: summary.identities,
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
    storagePath,
    bankBalanceLabelForbidden: true,
    ...summary,
  };
}

/** In-memory defaults for tests (no DB). */
export function policyRulesForPrefix(prefix: string): ProfitPolicyRuleInput[] {
  return toPolicyInputs(defaultProfitRulesForPrefix(prefix));
}

export { PROFIT_CATEGORY_LABELS };

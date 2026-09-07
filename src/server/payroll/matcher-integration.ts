import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import {
  extractBeneficiaryFromParticulars,
  normalizeName,
  rankMatchSuggestions,
  type MatchCandidateInput,
} from "@/server/statements/matching";

function numericValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[₹,\s]/g, ""));
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function expectedNetPay(components: Prisma.JsonValue | null | undefined): number | undefined {
  if (!components || typeof components !== "object" || Array.isArray(components)) return undefined;
  const record = components as Record<string, unknown>;
  for (const key of ["netPay", "netAmount", "netSalary", "NET_PAY", "NET_AMOUNT"]) {
    const amount = numericValue(record[key]);
    if (amount !== undefined) return amount;
  }

  const earnings = numericValue(record.grossEarnings ?? record.gross ?? record.GROSS);
  const deductions = numericValue(
    record.grossDeductions ?? record.totalDeductions ?? record.DEDUCTIONS,
  );
  return earnings !== undefined ? earnings - (deductions ?? 0) : undefined;
}

export async function generateStatementMatchSuggestions(input: {
  companyId: string;
  statementId: string;
  threshold?: number;
}) {
  const [statement, employees] = await Promise.all([
    prisma.bankStatement.findFirst({
      where: { id: input.statementId, companyId: input.companyId },
      include: {
        transactions: {
          where: { debit: { gt: 0 } },
          orderBy: { rowIndex: "asc" },
        },
      },
    }),
    prisma.employee.findMany({
      where: { companyId: input.companyId, status: "ACTIVE" },
      include: {
        bankAccount: true,
        salaryStructure: true,
        priorMappings: true,
      },
      orderBy: { employeeCode: "asc" },
    }),
  ]);
  if (!statement) throw new Error("Bank statement not found in company scope");

  const suggestions = statement.transactions.flatMap((transaction) => {
    const beneficiary = normalizeName(
      extractBeneficiaryFromParticulars(transaction.particulars),
    );
    const candidates: MatchCandidateInput[] = employees.map((employee) => ({
      employeeId: employee.id,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      accountLast4: employee.bankAccount?.accountLast4,
      expectedNetPay: expectedNetPay(employee.salaryStructure?.componentsJson),
      hasPriorApprovedMapping: employee.priorMappings.some(
        (mapping) => normalizeName(mapping.normalizedName) === beneficiary,
      ),
    }));
    const amount = Number(transaction.debit);

    return rankMatchSuggestions(
      { particulars: transaction.particulars, amount },
      candidates,
      input.threshold,
    )
      .filter((suggestion) => suggestion.score > 0)
      .map((suggestion) => ({
        transactionId: transaction.id,
        employeeId: suggestion.employeeId,
        score: suggestion.score,
        status: suggestion.status,
        breakdownJson: suggestion.breakdown,
      }));
  });

  await prisma.$transaction(async (tx) => {
    await tx.statementMatchSuggestion.deleteMany({
      where: { transaction: { statementId: statement.id } },
    });
    if (suggestions.length) {
      await tx.statementMatchSuggestion.createMany({ data: suggestions });
    }
    await tx.auditLog.create({
      data: {
        companyId: input.companyId,
        action: "statement.match_suggestions_generate",
        entityType: "BankStatement",
        entityId: statement.id,
        metadataJson: {
          transactionCount: statement.transactions.length,
          suggestionCount: suggestions.length,
          threshold: input.threshold ?? 50,
        },
      },
    });
  });

  return suggestions;
}

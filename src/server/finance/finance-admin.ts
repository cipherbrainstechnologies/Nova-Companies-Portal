import { prisma } from "@/server/db";
import { computeMonthlyProfit } from "@/server/finance/profit-engine";
import { parseStatementJob } from "@/server/statements/statement-service";

/**
 * Clear derived finance calculations only.
 * Preserves statements, transactions, manual classifications, employees, payroll, payslips.
 */
export async function clearFinanceCalculations(input: {
  actorUserId: string;
  companyId?: string | "ALL";
}) {
  const companyFilter =
    input.companyId && input.companyId !== "ALL" ? { companyId: input.companyId } : {};

  const result = await prisma.$transaction(async (tx) => {
    const deleted = await tx.profitReportSnapshot.deleteMany({ where: companyFilter });
    await tx.auditLog.create({
      data: {
        actorUserId: input.actorUserId,
        companyId: input.companyId && input.companyId !== "ALL" ? input.companyId : null,
        action: "finance.calculations_clear",
        entityType: "ProfitReportSnapshot",
        metadataJson: {
          scope: input.companyId ?? "ALL",
          snapshotsDeleted: deleted.count,
          preserved: [
            "uploaded statements",
            "canonical bank transactions",
            "manual classifications",
            "company profit policy rules",
            "employees and salary structures",
            "payroll runs and payslips",
            "audit history",
          ],
          rebuiltLater: [
            "finance snapshots",
            "dashboard totals",
            "monthly summaries",
            "growth calculations",
            "automatic classification suggestions on reprocess",
          ],
        },
      },
    });
    return deleted.count;
  });

  return { snapshotsDeleted: result };
}

/** Reparse every PARSED/FAILED statement for a company (or all). Never issues payslips. */
export async function reprocessExistingStatements(input: {
  actorUserId: string;
  companyId?: string | "ALL";
}) {
  const statements = await prisma.bankStatement.findMany({
    where: {
      ...(input.companyId && input.companyId !== "ALL" ? { companyId: input.companyId } : {}),
      status: { in: ["UPLOADED", "PARSED", "FAILED", "PARSING"] },
    },
    select: { id: true, companyId: true },
    orderBy: { createdAt: "asc" },
  });

  const results: Array<{ statementId: string; ok: boolean; error?: string }> = [];
  for (const statement of statements) {
    try {
      await parseStatementJob(statement.id);
      results.push({ statementId: statement.id, ok: true });
    } catch (err) {
      results.push({
        statementId: statement.id,
        ok: false,
        error: err instanceof Error ? err.message : "Reprocess failed",
      });
    }
  }

  await prisma.auditLog.create({
    data: {
      actorUserId: input.actorUserId,
      companyId: input.companyId && input.companyId !== "ALL" ? input.companyId : null,
      action: "finance.statements_reprocess",
      entityType: "BankStatement",
      metadataJson: {
        total: statements.length,
        succeeded: results.filter((r) => r.ok).length,
        failed: results.filter((r) => !r.ok).length,
      },
    },
  });

  return { results };
}

/** Recompute profit snapshots for live statement months (no payslip side effects). */
export async function recomputeFinanceLedgers(input: {
  actorUserId: string;
  companyId?: string | "ALL";
}) {
  const txns = await prisma.statementTransaction.findMany({
    where: {
      isDuplicate: false,
      ...(input.companyId && input.companyId !== "ALL"
        ? { statement: { companyId: input.companyId } }
        : {}),
    },
    select: {
      salaryYear: true,
      salaryMonth: true,
      txnDate: true,
      statement: { select: { companyId: true } },
    },
  });

  const keys = new Set<string>();
  for (const txn of txns) {
    const year = txn.salaryYear ?? txn.txnDate.getUTCFullYear();
    const month = txn.salaryMonth ?? txn.txnDate.getUTCMonth() + 1;
    keys.add(`${txn.statement.companyId}:${year}:${month}`);
  }

  let months = 0;
  for (const key of keys) {
    const [companyId, yearStr, monthStr] = key.split(":");
    await computeMonthlyProfit({
      companyId,
      year: Number(yearStr),
      month: Number(monthStr),
      persistSheet: false,
    });
    months += 1;
  }

  await prisma.auditLog.create({
    data: {
      actorUserId: input.actorUserId,
      companyId: input.companyId && input.companyId !== "ALL" ? input.companyId : null,
      action: "finance.ledger_recompute",
      entityType: "ProfitReportSnapshot",
      metadataJson: { months },
    },
  });

  return { months };
}

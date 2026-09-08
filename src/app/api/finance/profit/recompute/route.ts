import { NextResponse } from "next/server";
import { requireSessionUser } from "@/server/auth/session";
import { AuthError, AuthzError } from "@/server/rbac/permissions";
import { prisma } from "@/server/db";
import { computeMonthlyProfit } from "@/server/finance/profit-engine";

/**
 * Invalidate and recompute profit snapshots for every company/month that has
 * statement transactions — prevents stale collective cards after imports/rules.
 */
export async function POST() {
  try {
    const user = await requireSessionUser();
    if (user.globalRole !== "SUPER_ADMIN" && user.globalRole !== "OPERATIONS_MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const txns = await prisma.statementTransaction.findMany({
      where: { isDuplicate: false },
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
        actorUserId: user.id,
        action: "finance.profit_recompute",
        entityType: "ProfitReportSnapshot",
        metadataJson: { months },
      },
    });

    return NextResponse.json({ ok: true, months });
  } catch (err) {
    if (err instanceof AuthError || err instanceof AuthzError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}

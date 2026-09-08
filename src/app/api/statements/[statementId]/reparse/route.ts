import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/server/auth/session";
import { AuthError, AuthzError, requirePermission } from "@/server/rbac/permissions";
import { prisma } from "@/server/db";
import { parseStatementJob } from "@/server/statements/statement-service";

/** Re-run Axis/CSV parse for a stuck UPLOADED or FAILED statement (inline, no worker). */
export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ statementId: string }> },
) {
  try {
    const user = await requireSessionUser();
    const { statementId } = await ctx.params;
    const statement = await prisma.bankStatement.findUniqueOrThrow({
      where: { id: statementId },
      select: { id: true, companyId: true, status: true },
    });
    await requirePermission({
      user,
      companyId: statement.companyId,
      module: "statements",
      action: "create",
    });

    await parseStatementJob(statement.id);

    const refreshed = await prisma.bankStatement.findUniqueOrThrow({
      where: { id: statement.id },
      include: { _count: { select: { transactions: true } } },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        companyId: statement.companyId,
        action: "statement.reparse",
        entityType: "BankStatement",
        entityId: statement.id,
        metadataJson: {
          previousStatus: statement.status,
          status: refreshed.status,
          rowCount: refreshed._count.transactions,
        },
      },
    });

    return NextResponse.json({ statement: refreshed });
  } catch (err) {
    if (err instanceof AuthError || err instanceof AuthzError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Reparse failed" },
      { status: 400 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/server/auth/session";
import { AuthError, AuthzError, requirePermission } from "@/server/rbac/permissions";
import { payrollFacade } from "@/server/facades/payroll-facade";
import { prisma } from "@/server/db";

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ runId: string }> },
) {
  try {
    const user = await requireSessionUser();
    const { runId } = await ctx.params;
    const run = await prisma.payrollRun.findUniqueOrThrow({ where: { id: runId } });
    await requirePermission({
      user,
      companyId: run.companyId,
      module: "payroll",
      action: "approve",
    });
    const updated = await payrollFacade.approveRun({
      actorUserId: user.id,
      payrollRunId: runId,
    });
    return NextResponse.json({ run: updated });
  } catch (err) {
    if (err instanceof AuthError || err instanceof AuthzError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 400 },
    );
  }
}

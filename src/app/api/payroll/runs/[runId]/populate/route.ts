import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/server/auth/session";
import { authorize, apiError } from "@/server/api-helpers";
import { assertCompanyScope } from "@/server/rbac/permissions";
import { prisma } from "@/server/db";
import { payrollFacade } from "@/server/facades/payroll-facade";

const schema = z.object({
  matchPayments: z.boolean().optional(),
  daysBefore: z.number().int().min(0).max(90).optional(),
  daysAfter: z.number().int().min(0).max(120).optional(),
});

export async function POST(
  request: Request,
  ctx: { params: Promise<{ runId: string }> },
) {
  try {
    const user = await requireSessionUser();
    const { runId } = await ctx.params;
    const body = schema.parse(await request.json().catch(() => ({})));
    const run = await prisma.payrollRun.findUniqueOrThrow({ where: { id: runId } });
    await authorize(user, run.companyId, "payroll", "create");
    assertCompanyScope(run.companyId, run.companyId);
    const result = await payrollFacade.populateEmployeeLines({
      actorUserId: user.id,
      payrollRunId: runId,
      matchPayments: body.matchPayments,
    });
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error);
  }
}

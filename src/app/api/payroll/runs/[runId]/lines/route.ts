import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/server/auth/session";
import { AuthError, AuthzError, requirePermission } from "@/server/rbac/permissions";
import { payrollFacade } from "@/server/facades/payroll-facade";
import { prisma } from "@/server/db";

const schema = z.object({
  employeeId: z.string(),
  earnings: z.array(
    z.object({
      code: z.string(),
      label: z.string(),
      actual: z.number(),
      payable: z.number(),
    }),
  ),
  deductions: z.array(
    z.object({
      code: z.string(),
      label: z.string(),
      amount: z.number(),
    }),
  ),
  working: z
    .object({
      workingDays: z.number().optional(),
      weeklyOffs: z.number().optional(),
      paidHolidays: z.number().optional(),
      presentDays: z.number().optional(),
      casualLeave: z.number().optional(),
      privilegedLeave: z.number().optional(),
      sickLeave: z.number().optional(),
      leaveWithoutPay: z.number().optional(),
    })
    .optional(),
  cashComponent: z.number().optional(),
  primaryTxnId: z.string().optional(),
  approve: z.boolean().optional(),
});

export async function POST(
  req: NextRequest,
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
      action: "edit",
    });
    const body = schema.parse(await req.json());
    const line = await payrollFacade.upsertEmployeeLine({
      actorUserId: user.id,
      payrollRunId: runId,
      ...body,
    });
    if (body.approve) {
      await requirePermission({
        user,
        companyId: run.companyId,
        module: "payroll",
        action: "approve",
      });
      await payrollFacade.approveLine({ actorUserId: user.id, lineId: line.id });
    }
    return NextResponse.json({ line });
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

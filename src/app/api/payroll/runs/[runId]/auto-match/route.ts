import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/server/auth/session";
import { authorize, apiError } from "@/server/api-helpers";
import { prisma } from "@/server/db";
import { runPayrollPaymentMatch } from "@/server/payroll/payment-auto-match";

const schema = z.object({
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
    await authorize(user, run.companyId, "statements", "reconcile");
    if (["ISSUED", "ISSUING", "CANCELLED", "SUPERSEDED"].includes(run.status)) {
      return NextResponse.json(
        { error: "Cannot auto-match an issued or locked payroll run" },
        { status: 400 },
      );
    }
    const summary = await runPayrollPaymentMatch({
      actorUserId: user.id,
      payrollRunId: runId,
      daysBefore: body.daysBefore,
      daysAfter: body.daysAfter,
      preserveManual: true,
    });
    return NextResponse.json({ summary });
  } catch (error) {
    return apiError(error);
  }
}

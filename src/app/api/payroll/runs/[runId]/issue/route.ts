import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/server/auth/session";
import { authorize, apiError } from "@/server/api-helpers";
import { assertCompanyScope } from "@/server/rbac/permissions";
import { payrollFacade } from "@/server/facades/payroll-facade";
import { prisma } from "@/server/db";

const schema = z.object({
  companyId: z.string().min(1), lineIds: z.array(z.string().min(1)).min(1),
  confirmation: z.object({ count: z.number().int().positive(), month: z.number().int().min(1).max(12), companyId: z.string().min(1) }),
});

export async function POST(request: Request, { params }: { params: Promise<{ runId: string }> }) {
  try {
    const user = await requireSessionUser(); const { runId } = await params; const body = schema.parse(await request.json());
    await authorize(user, body.companyId, "payroll", "issue");
    const run = await prisma.payrollRun.findUniqueOrThrow({ where: { id: runId } }); assertCompanyScope(run.companyId, body.companyId);
    if (body.confirmation.companyId !== body.companyId) return NextResponse.json({ error: "Confirmation company mismatch" }, { status: 400 });
    return NextResponse.json(await payrollFacade.issueSelectedPayslips({ actorUserId: user.id, payrollRunId: runId, lineIds: body.lineIds, confirmation: body.confirmation }), { status: 202 });
  } catch (error) { return apiError(error); }
}

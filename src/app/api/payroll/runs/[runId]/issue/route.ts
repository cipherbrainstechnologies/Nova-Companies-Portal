import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/server/auth/session";
import { authorize, apiError } from "@/server/api-helpers";
import { assertCompanyScope } from "@/server/rbac/permissions";
import { payrollFacade } from "@/server/facades/payroll-facade";
import { partitionIssuableLines } from "@/server/payroll/payment-decision";
import { PAYROLL_AUDIT_ACTIONS } from "@/server/payroll/audit-actions";
import { writeAudit } from "@/server/audit";
import { prisma } from "@/server/db";

const schema = z.object({
  companyId: z.string().min(1),
  lineIds: z.array(z.string().min(1)).default([]),
  /** Issue every approved line whose payment is reconciled, ignoring `lineIds`. */
  approvedOnly: z.boolean().default(false),
  confirmation: z.object({ count: z.number().int().positive(), month: z.number().int().min(1).max(12), companyId: z.string().min(1) }),
});

export async function POST(request: Request, { params }: { params: Promise<{ runId: string }> }) {
  try {
    const user = await requireSessionUser(); const { runId } = await params; const body = schema.parse(await request.json());
    await authorize(user, body.companyId, "payroll", "issue");
    const run = await prisma.payrollRun.findUniqueOrThrow({ where: { id: runId } }); assertCompanyScope(run.companyId, body.companyId);
    if (body.confirmation.companyId !== body.companyId) return NextResponse.json({ error: "Confirmation company mismatch" }, { status: 400 });

    const candidates = await prisma.payrollEmployeeLine.findMany({
      where: body.approvedOnly
        ? { payrollRunId: runId, status: "APPROVED" }
        : { payrollRunId: runId, id: { in: body.lineIds } },
      select: { id: true, paymentStatus: true },
    });
    const { issuable, blocked } = partitionIssuableLines(candidates);

    if (body.approvedOnly) {
      if (!issuable.length) {
        return NextResponse.json({ error: "No approved and reconciled lines to issue" }, { status: 400 });
      }
      if (body.confirmation.count !== issuable.length) {
        // The set changed since the operator confirmed; make them re-confirm the new count.
        return NextResponse.json(
          { error: "Approved line count changed since confirmation", expectedCount: issuable.length },
          { status: 409 },
        );
      }
    } else {
      if (!body.lineIds.length) return NextResponse.json({ error: "A line selection is required" }, { status: 400 });
      if (blocked.length) {
        return NextResponse.json(
          {
            error: "Selection includes lines that still require reconciliation review",
            blockedLineIds: blocked.map((line) => line.id),
          },
          { status: 409 },
        );
      }
    }

    const lineIds = body.approvedOnly ? issuable.map((line) => line.id) : body.lineIds;
    const issued = await payrollFacade.issueSelectedPayslips({
      actorUserId: user.id,
      payrollRunId: runId,
      lineIds,
      confirmation: body.confirmation,
    });

    if (body.approvedOnly) {
      await writeAudit({
        actorUserId: user.id,
        companyId: run.companyId,
        action: PAYROLL_AUDIT_ACTIONS.payrollIssueApproved,
        entityType: "PayrollRun",
        entityId: run.id,
        metadata: { count: lineIds.length, skippedForReview: blocked.length },
      });
    }

    return NextResponse.json(issued, { status: 202 });
  } catch (error) { return apiError(error); }
}

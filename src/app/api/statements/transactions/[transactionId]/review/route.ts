import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/server/auth/session";
import { apiError, authorize } from "@/server/api-helpers";
import { reviewReconciliationTransaction } from "@/server/payroll/reconciliation-automation";
import { prisma } from "@/server/db";

const schema = z.object({
  action: z.enum(["approve", "reject", "map", "ignore", "non_payroll"]),
  employeeId: z.string().min(1).optional(),
  varianceClassification: z
    .enum([
      "OVERTIME",
      "BONUS",
      "REIMBURSEMENT",
      "ADJUSTMENT",
      "ARREARS",
      "DUPLICATE_PAYMENT",
      "UNPAID_LEAVE",
      "LOAN_DEDUCTION",
      "CASH_COMPONENT",
      "OTHER",
    ])
    .optional(),
  reason: z.string().trim().max(500).optional(),
  companyId: z.string().min(1).optional(),
  salaryYear: z.coerce.number().int().min(2000).max(2200).optional(),
  salaryMonth: z.coerce.number().int().min(1).max(12).optional(),
  rememberBeneficiaryAlias: z.boolean().optional(),
  payrollRunId: z.string().min(1).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ transactionId: string }> },
) {
  try {
    const user = await requireSessionUser();
    const { transactionId } = await params;
    const body = schema.parse(await request.json());

    const transaction = await prisma.statementTransaction.findUniqueOrThrow({
      where: { id: transactionId },
      select: { statement: { select: { companyId: true } } },
    });
    const companyId = transaction.statement.companyId;
    if (body.companyId && body.companyId !== companyId) {
      return NextResponse.json({ error: "Company scope mismatch" }, { status: 403 });
    }
    await authorize(user, companyId, "statements", "reconcile");

    const updated = await reviewReconciliationTransaction({
      actorUserId: user.id,
      transactionId,
      action: body.action,
      companyId,
      employeeId: body.employeeId,
      varianceClassification: body.varianceClassification,
      reason: body.reason,
      salaryYear: body.salaryYear,
      salaryMonth: body.salaryMonth,
      rememberBeneficiaryAlias: body.rememberBeneficiaryAlias,
      payrollRunId: body.payrollRunId,
    });

    return NextResponse.json({ transaction: updated });
  } catch (error) {
    return apiError(error);
  }
}

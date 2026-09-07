import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/server/auth/session";
import { AuthError, AuthzError, requirePermission } from "@/server/rbac/permissions";
import { classifyTransaction } from "@/server/statements/statement-service";
import { prisma } from "@/server/db";

const schema = z.object({
  classification: z.enum([
    "SALARY",
    "OVERTIME",
    "REIMBURSEMENT",
    "TAX",
    "EXPENSE",
    "LOAN_EMI",
    "OWNER_TRANSFER",
    "CREDIT_CARD",
    "CASH_WITHDRAWAL",
    "REVENUE",
    "PF_ESI",
    "CONTRACTOR",
    "IGNORE",
    "UNCLASSIFIED",
  ]),
  notes: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ transactionId: string }> },
) {
  try {
    const user = await requireSessionUser();
    const { transactionId } = await ctx.params;
    const txn = await prisma.statementTransaction.findUniqueOrThrow({
      where: { id: transactionId },
      include: { statement: true },
    });
    await requirePermission({
      user,
      companyId: txn.statement.companyId,
      module: "statements",
      action: "edit",
    });
    const body = schema.parse(await req.json());
    const updated = await classifyTransaction({
      companyId: txn.statement.companyId,
      classifiedById: user.id,
      transactionId,
      classification: body.classification,
      notes: body.notes,
    });
    return NextResponse.json({ transaction: updated });
  } catch (err) {
    if (err instanceof AuthError || err instanceof AuthzError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Failed" }, { status: 400 });
  }
}

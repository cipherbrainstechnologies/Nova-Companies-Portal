import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/server/auth/session";
import { AuthError, AuthzError, requirePermission } from "@/server/rbac/permissions";
import { prisma } from "@/server/db";
import { PROFIT_CATEGORY_LABELS, type ProfitCategoryKey } from "@/server/finance/profit-categories";

const categoryKeys = Object.keys(PROFIT_CATEGORY_LABELS) as [ProfitCategoryKey, ...ProfitCategoryKey[]];

const upsertSchema = z.object({
  id: z.string().optional(),
  companyId: z.string().min(1),
  matchPattern: z.string().min(1),
  classification: z
    .enum([
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
    ])
    .nullable()
    .optional(),
  treatment: z.enum([
    "BUSINESS_EXPENSE",
    "FINANCING_OR_PERSONAL",
    "OWNER_EXCLUDED",
    "REVENUE",
    "IGNORE",
  ]),
  categoryKey: z.enum(categoryKeys),
  label: z.string().optional(),
  direction: z.enum(["credit", "debit"]).nullable().optional(),
  priority: z.number().int().min(0).max(1000).default(100),
  isActive: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireSessionUser();
    const companyId = req.nextUrl.searchParams.get("companyId");
    if (!companyId) {
      return NextResponse.json({ error: "companyId required" }, { status: 400 });
    }
    await requirePermission({ user, companyId, module: "finance", action: "view" });
    const rules = await prisma.profitPolicyRule.findMany({
      where: { companyId },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json({ rules, categoryLabels: PROFIT_CATEGORY_LABELS });
  } catch (err) {
    if (err instanceof AuthError || err instanceof AuthzError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireSessionUser();
    const body = upsertSchema.parse(await req.json());
    await requirePermission({
      user,
      companyId: body.companyId,
      module: "finance",
      action: "edit",
    });

    const data = {
      matchPattern: body.matchPattern,
      classification: body.classification ?? null,
      treatment: body.treatment,
      categoryKey: body.categoryKey,
      label: body.label ?? PROFIT_CATEGORY_LABELS[body.categoryKey],
      direction: body.direction ?? null,
      priority: body.priority,
      isActive: body.isActive ?? true,
    };

    const rule = body.id
      ? await prisma.profitPolicyRule.update({
          where: { id: body.id },
          data,
        })
      : await prisma.profitPolicyRule.create({
          data: { companyId: body.companyId, ...data },
        });

    await prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        companyId: body.companyId,
        action: body.id ? "finance.profit_policy_update" : "finance.profit_policy_create",
        entityType: "ProfitPolicyRule",
        entityId: rule.id,
        metadataJson: data,
      },
    });

    return NextResponse.json({ rule });
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

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireSessionUser();
    const id = req.nextUrl.searchParams.get("id");
    const companyId = req.nextUrl.searchParams.get("companyId");
    if (!id || !companyId) {
      return NextResponse.json({ error: "id and companyId required" }, { status: 400 });
    }
    await requirePermission({ user, companyId, module: "finance", action: "edit" });
    const existing = await prisma.profitPolicyRule.findFirst({
      where: { id, companyId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await prisma.profitPolicyRule.delete({ where: { id } });
    await prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        companyId,
        action: "finance.profit_policy_delete",
        entityType: "ProfitPolicyRule",
        entityId: id,
        metadataJson: { matchPattern: existing.matchPattern },
      },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError || err instanceof AuthzError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

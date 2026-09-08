import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/server/auth/session";
import { AuthError, AuthzError } from "@/server/rbac/permissions";
import {
  clearFinanceCalculations,
  recomputeFinanceLedgers,
  reprocessExistingStatements,
} from "@/server/finance/finance-admin";

const schema = z.object({
  action: z.enum(["clear", "reprocess", "recompute"]),
  companyId: z.string().min(1).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireSessionUser();
    if (user.globalRole !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Only Super Admin can clear or reprocess finance" }, { status: 403 });
    }
    const body = schema.parse(await req.json());
    const companyId = body.companyId ?? "ALL";

    if (body.action === "clear") {
      const result = await clearFinanceCalculations({
        actorUserId: user.id,
        companyId,
      });
      return NextResponse.json({
        ok: true,
        ...result,
        message:
          "Finance calculations cleared. Reprocess existing statements or upload statements to rebuild the ledger.",
      });
    }

    if (body.action === "reprocess") {
      const result = await reprocessExistingStatements({
        actorUserId: user.id,
        companyId,
      });
      return NextResponse.json({ ok: true, ...result });
    }

    const result = await recomputeFinanceLedgers({
      actorUserId: user.id,
      companyId,
    });
    return NextResponse.json({ ok: true, ...result });
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

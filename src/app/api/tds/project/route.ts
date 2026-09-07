import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/server/auth/session";
import { AuthError, AuthzError, requirePermission } from "@/server/rbac/permissions";
import { calculateTdsProjection } from "@/server/tds/tds-engine";

const schema = z.object({
  companyId: z.string().optional(),
  monthlyTaxableComponents: z.number(),
  monthsElapsed: z.number().int().min(0).max(11),
  deductedYtd: z.number().min(0),
  regime: z.enum(["OLD", "NEW"]),
  config: z.object({
    slabs: z.array(
      z.object({
        upTo: z.number().nullable(),
        rate: z.number().min(0).max(1),
      }),
    ),
    standardDeduction: z.number().optional(),
  }),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireSessionUser();
    const body = schema.parse(await req.json());
    if (body.companyId) {
      await requirePermission({ user, companyId: body.companyId, module: "tds", action: "view" });
    } else if (user.globalRole === "EMPLOYEE") {
      throw new AuthzError();
    }
    const projection = calculateTdsProjection(body);
    return NextResponse.json({ projection });
  } catch (err) {
    if (err instanceof AuthError || err instanceof AuthzError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Failed" }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/server/api-helpers";
import { requireSessionUser } from "@/server/auth/session";
import { requireNovaClientAdmin } from "@/server/client/client-authz";
import { freezeEmployerCostSnapshots } from "@/server/client/cost-snapshot-service";

const schema = z.object({
  periodYear: z.number().int(),
  periodMonth: z.number().int().min(1).max(12),
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ clientId: string }> },
) {
  try {
    const user = await requireSessionUser();
    await requireNovaClientAdmin(user);
    const { clientId } = await ctx.params;
    const body = schema.parse(await req.json());
    const result = await freezeEmployerCostSnapshots({
      clientOrganizationId: clientId,
      periodYear: body.periodYear,
      periodMonth: body.periodMonth,
      actorUserId: user.id,
    });
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error);
  }
}

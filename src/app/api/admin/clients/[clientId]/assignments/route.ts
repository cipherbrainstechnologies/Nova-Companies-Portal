import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/server/api-helpers";
import { requireSessionUser } from "@/server/auth/session";
import { requireNovaClientAdmin } from "@/server/client/client-authz";
import { clientOrganizationFacade } from "@/server/facades/client-organization-facade";

const schema = z.object({
  employeeId: z.string(),
  novaCompanyId: z.string(),
  effectiveFrom: z.string().datetime(),
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
    const assignment = await clientOrganizationFacade.assignEmployee({
      actorUserId: user.id,
      clientId,
      employeeId: body.employeeId,
      novaCompanyId: body.novaCompanyId,
      effectiveFrom: new Date(body.effectiveFrom),
    });
    return NextResponse.json({ assignment });
  } catch (error) {
    return apiError(error);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/server/api-helpers";
import { requireSessionUser } from "@/server/auth/session";
import { requireNovaClientAdmin } from "@/server/client/client-authz";
import { clientOrganizationFacade } from "@/server/facades/client-organization-facade";

const schema = z.object({
  currency: z.string().min(3).max(3),
  feePerEmployee: z.string(),
  setupFee: z.string().optional(),
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
    const pricing = await clientOrganizationFacade.upsertPricing({
      actorUserId: user.id,
      clientId,
      ...body,
    });
    return NextResponse.json({ pricing });
  } catch (error) {
    return apiError(error);
  }
}

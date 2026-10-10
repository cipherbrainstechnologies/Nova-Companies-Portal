import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/server/api-helpers";
import { requireSessionUser } from "@/server/auth/session";
import { requireClientCapability } from "@/server/client/client-authz";
import { clientOrganizationFacade } from "@/server/facades/client-organization-facade";

const schema = z.object({
  candidate: z.record(z.string(), z.unknown()),
  provisionalCost: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ clientSlug: string }> },
) {
  try {
    const { clientSlug } = await ctx.params;
    const user = await requireSessionUser();
    const membership = await requireClientCapability({
      user,
      clientSlug,
      module: "team",
      action: "CREATE",
    });
    if (membership.lifecycleStatus !== "ACTIVE" && user.globalRole === "CLIENT_USER") {
      return NextResponse.json({ error: "Client account not active" }, { status: 403 });
    }
    const body = schema.parse(await req.json());
    const hire = await clientOrganizationFacade.createHireRequest({
      clientOrganizationId: membership.clientOrganizationId,
      actorUserId: user.id,
      candidate: body.candidate,
      provisionalCost: body.provisionalCost,
    });
    return NextResponse.json({ hire });
  } catch (error) {
    return apiError(error);
  }
}

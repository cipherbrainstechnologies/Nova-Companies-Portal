import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/server/api-helpers";
import { requireSessionUser } from "@/server/auth/session";
import { requireClientCapability } from "@/server/client/client-authz";
import { assertClientPortalActor } from "@/server/client/mutation-guard";
import { clientOrganizationFacade } from "@/server/facades/client-organization-facade";

const schema = z.object({
  email: z.string().email(),
  portalRole: z.enum(["OWNER_ADMIN", "HR_MANAGER", "FINANCE", "TEAM_MANAGER", "READ_ONLY_AUDITOR"]),
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
      module: "people",
      action: "INVITE",
    });
    assertClientPortalActor(membership);
    const body = schema.parse(await req.json());
    const { invite, token } = await clientOrganizationFacade.inviteClientUser({
      actorUserId: user.id,
      clientId: membership.clientOrganizationId,
      email: body.email,
      portalRole: body.portalRole,
    });
    return NextResponse.json({
      invite: { id: invite.id, email: invite.email, expiresAt: invite.expiresAt },
      acceptPath: `/client/accept-invite?token=${token}`,
    });
  } catch (error) {
    return apiError(error);
  }
}

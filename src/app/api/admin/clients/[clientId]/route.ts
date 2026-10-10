import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/server/api-helpers";
import { requireSessionUser } from "@/server/auth/session";
import { requireNovaClientAdmin } from "@/server/client/client-authz";
import { clientOrganizationFacade } from "@/server/facades/client-organization-facade";
import { canActivateClient } from "@/server/client/activation";
import { prisma } from "@/server/db";

const patchSchema = z.object({
  proposedNovaCompanyId: z.string().optional(),
  lifecycleStatus: z
    .enum([
      "DRAFT",
      "INVITED",
      "KYB_IN_PROGRESS",
      "KYB_REVIEW",
      "CONTRACT_PENDING",
      "SIGNATURE_PENDING",
      "COMPLIANCE_REVIEW",
      "ACTIVE",
      "CHANGES_REQUESTED",
      "REJECTED",
      "SUSPENDED",
      "OFFBOARDING",
      "CLOSED",
    ])
    .optional(),
});

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ clientId: string }> },
) {
  try {
    const user = await requireSessionUser();
    await requireNovaClientAdmin(user);
    const { clientId } = await ctx.params;
    const client = await clientOrganizationFacade.getClient(clientId);
    if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const activation = await canActivateClient(clientId);
    return NextResponse.json({ client, activation });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ clientId: string }> },
) {
  try {
    const user = await requireSessionUser();
    await requireNovaClientAdmin(user);
    const { clientId } = await ctx.params;
    const body = patchSchema.parse(await req.json());

    if (body.proposedNovaCompanyId) {
      await prisma.clientOrganization.update({
        where: { id: clientId },
        data: { proposedNovaCompanyId: body.proposedNovaCompanyId },
      });
    }
    if (body.lifecycleStatus) {
      await clientOrganizationFacade.updateLifecycle({
        actorUserId: user.id,
        clientId,
        status: body.lifecycleStatus,
      });
    }
    const client = await clientOrganizationFacade.getClient(clientId);
    return NextResponse.json({ client });
  } catch (error) {
    return apiError(error);
  }
}

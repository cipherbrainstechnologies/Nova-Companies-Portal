import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/server/api-helpers";
import { requireSessionUser } from "@/server/auth/session";
import { requireNovaClientAdmin } from "@/server/client/client-authz";
import { prisma } from "@/server/db";
import { writeClientActivity } from "@/server/client/client-audit";

const schema = z.object({
  status: z.enum(["NOVA_REVIEW", "OFFER_PENDING", "REJECTED", "MORE_INFO"]),
  notes: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ requestId: string }> },
) {
  try {
    const user = await requireSessionUser();
    await requireNovaClientAdmin(user);
    const { requestId } = await ctx.params;
    const body = schema.parse(await req.json());
    const updated = await prisma.hireRequest.update({
      where: { id: requestId },
      data: { status: body.status },
    });
    await writeClientActivity({
      clientOrganizationId: updated.clientOrganizationId,
      actorUserId: user.id,
      action: "hire.nova_review",
      entityType: "HireRequest",
      entityId: updated.id,
      metadata: { status: body.status, notes: body.notes },
    });
    return NextResponse.json({ request: updated });
  } catch (error) {
    return apiError(error);
  }
}

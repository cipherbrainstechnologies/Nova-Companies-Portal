import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/server/api-helpers";
import { requireSessionUser } from "@/server/auth/session";
import { requireClientCapability } from "@/server/client/client-authz";
import { assertClientPortalActor } from "@/server/client/mutation-guard";
import { prisma } from "@/server/db";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ clientSlug: string }> },
) {
  try {
    const { clientSlug } = await ctx.params;
    const user = await requireSessionUser();
    const membership = await requireClientCapability({
      user,
      clientSlug,
      module: "approvals",
      action: "VIEW",
    });
    const tasks = await prisma.clientApprovalTask.findMany({
      where: { clientOrganizationId: membership.clientOrganizationId, status: "OPEN" },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ tasks });
  } catch (error) {
    return apiError(error);
  }
}

const patchSchema = z.object({
  taskId: z.string(),
  decision: z.enum(["APPROVED", "REJECTED"]),
  reason: z.string().optional(),
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
      module: "approvals",
      action: "APPROVE",
    });
    assertClientPortalActor(membership);
    const body = patchSchema.parse(await req.json());
    const existing = await prisma.clientApprovalTask.findFirst({
      where: { id: body.taskId, clientOrganizationId: membership.clientOrganizationId },
    });
    if (!existing) throw new Error("Not found");
    const task = await prisma.clientApprovalTask.update({
      where: { id: body.taskId },
      data: {
        status: body.decision,
        decidedAt: new Date(),
        decisionReason: body.reason,
      },
    });
    return NextResponse.json({ task });
  } catch (error) {
    return apiError(error);
  }
}

import { NextResponse } from "next/server";
import { apiError } from "@/server/api-helpers";
import { requireSessionUser } from "@/server/auth/session";
import { requireClientCapability } from "@/server/client/client-authz";
import { prisma } from "@/server/db";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ clientSlug: string }> },
) {
  try {
    const { clientSlug } = await ctx.params;
    const user = await requireSessionUser();
    const membership = await requireClientCapability({
      user,
      clientSlug,
      module: "onboarding",
      action: "VIEW",
    });
    const caseRow = await prisma.clientOnboardingCase.findFirst({
      where: { clientOrganizationId: membership.clientOrganizationId },
      orderBy: { createdAt: "desc" },
      include: { kybDocuments: true, complianceReviews: { orderBy: { createdAt: "desc" }, take: 5 } },
    });
    const client = await prisma.clientOrganization.findUniqueOrThrow({
      where: { id: membership.clientOrganizationId },
    });
    return NextResponse.json({ client, case: caseRow });
  } catch (error) {
    return apiError(error);
  }
}

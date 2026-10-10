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
      module: "documents",
      action: "VIEW",
    });
    const agreements = await prisma.novaEntityClientAgreement.findMany({
      where: { clientOrganizationId: membership.clientOrganizationId },
      include: { documents: true, signatureEnvelopes: true },
    });
    return NextResponse.json({ agreements });
  } catch (error) {
    return apiError(error);
  }
}

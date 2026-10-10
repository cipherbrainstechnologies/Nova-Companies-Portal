import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/server/api-helpers";
import { requireSessionUser } from "@/server/auth/session";
import { requireNovaClientAdmin } from "@/server/client/client-authz";
import { issueClientInvoice } from "@/server/client/invoice-service";
import { prisma } from "@/server/db";

const schema = z.object({
  periodYear: z.number().int(),
  periodMonth: z.number().int().min(1).max(12),
  currency: z.string().length(3).optional(),
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
    const client = await prisma.clientOrganization.findUniqueOrThrow({ where: { id: clientId } });
    if (!client.proposedNovaCompanyId) {
      return NextResponse.json({ error: "NOVA entity not assigned" }, { status: 400 });
    }
    const invoice = await issueClientInvoice({
      clientOrganizationId: clientId,
      novaCompanyId: client.proposedNovaCompanyId,
      periodYear: body.periodYear,
      periodMonth: body.periodMonth,
      currency: body.currency ?? client.billingCurrency,
      actorUserId: user.id,
    });
    return NextResponse.json({ invoice });
  } catch (error) {
    return apiError(error);
  }
}

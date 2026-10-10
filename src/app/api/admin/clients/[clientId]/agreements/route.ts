import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/server/api-helpers";
import { requireSessionUser } from "@/server/auth/session";
import { requireNovaClientAdmin } from "@/server/client/client-authz";
import { clientOrganizationFacade } from "@/server/facades/client-organization-facade";

const createSchema = z.object({
  novaCompanyId: z.string(),
  contractVersion: z.string().min(1),
});

const signSchema = z.object({
  envelopeId: z.string(),
  signerName: z.string(),
  signerEmail: z.string().email(),
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ clientId: string }> },
) {
  try {
    const user = await requireSessionUser();
    await requireNovaClientAdmin(user);
    const { clientId } = await ctx.params;
    const body = await req.json();
    if (body.action === "sign") {
      const parsed = signSchema.parse(body);
      await clientOrganizationFacade.markAgreementSigned({
        actorUserId: user.id,
        clientId,
        ...parsed,
      });
      return NextResponse.json({ ok: true });
    }
    const parsed = createSchema.parse(body);
    const agreement = await clientOrganizationFacade.createAgreementShell({
      actorUserId: user.id,
      clientId,
      novaCompanyId: parsed.novaCompanyId,
      contractVersion: parsed.contractVersion,
    });
    return NextResponse.json({ agreement });
  } catch (error) {
    return apiError(error);
  }
}

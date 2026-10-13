import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/server/api-helpers";
import { requireSessionUser } from "@/server/auth/session";
import { requireNovaClientAdmin } from "@/server/client/client-authz";
import { generateClientDocumentPack } from "@/server/client/legal-document-service";
import { clientOrganizationFacade } from "@/server/facades/client-organization-facade";

const profileSchema = z.object({
  registeredAddress: z.string().optional(),
  industry: z.string().optional(),
  representativeName: z.string().optional(),
  representativePosition: z.string().optional(),
  representativeEmail: z.string().optional(),
  representativePhone: z.string().optional(),
  planId: z.enum(["essential", "managed", "enterprise"]).optional(),
  proposedFee: z.string().optional(),
  paymentTerms: z.string().optional(),
  minimumEngagement: z.string().optional(),
  commencementDate: z.string().optional(),
  additionalServices: z.string().optional(),
  workforceMode: z.enum(["new_hires", "transfer", "both"]).optional(),
  dataProcessing: z.enum(["required", "not_required", "unknown"]).optional(),
  specialCompliance: z.string().optional(),
  governingLaw: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ clientId: string }> },
) {
  try {
    const user = await requireSessionUser();
    await requireNovaClientAdmin(user);
    const { clientId } = await ctx.params;
    const body = z
      .object({
        regenerate: z.boolean().optional(),
        code: z.string().optional(),
        profile: profileSchema.optional(),
        legalName: z.string().optional(),
        registrationNumber: z.string().optional(),
        billingCurrency: z.string().optional(),
        proposedNovaCompanyId: z.string().optional(),
      })
      .parse(await req.json());

    if (body.profile) {
      const result = await clientOrganizationFacade.updateOnboardingProfile({
        actorUserId: user.id,
        clientId,
        legalName: body.legalName,
        registrationNumber: body.registrationNumber,
        billingCurrency: body.billingCurrency,
        proposedNovaCompanyId: body.proposedNovaCompanyId,
        profile: body.profile,
      });
      return NextResponse.json(result);
    }

    const documents = await generateClientDocumentPack({
      actorUserId: user.id,
      clientId,
      regenerate: body.regenerate,
      codes: body.code ? [body.code] : undefined,
    });
    return NextResponse.json({ documents });
  } catch (error) {
    return apiError(error);
  }
}

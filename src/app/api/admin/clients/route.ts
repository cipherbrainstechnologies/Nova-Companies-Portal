import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/server/api-helpers";
import { requireSessionUser } from "@/server/auth/session";
import { requireNovaClientAdmin } from "@/server/client/client-authz";
import { clientOrganizationFacade } from "@/server/facades/client-organization-facade";

const profileSchema = z.object({
  registeredAddress: z.string().optional(),
  industry: z.string().optional(),
  representativeName: z.string().optional(),
  representativePosition: z.string().optional(),
  representativeEmail: z.string().email().optional().or(z.literal("")),
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

const createSchema = z.object({
  legalName: z.string().min(2),
  tradeName: z.string().optional(),
  countryCode: z.string().min(2).max(2),
  registrationNumber: z.string().optional(),
  taxId: z.string().optional(),
  website: z.string().optional(),
  billingCurrency: z.string().optional(),
  intendedEmployeeCount: z.number().int().positive().optional(),
  proposedNovaCompanyId: z.string().optional(),
  profile: profileSchema.optional(),
});

export async function GET() {
  try {
    const user = await requireSessionUser();
    await requireNovaClientAdmin(user);
    const clients = await clientOrganizationFacade.listClients();
    return NextResponse.json({ clients });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireSessionUser();
    await requireNovaClientAdmin(user);
    if (user.globalRole !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Only a Super Admin can add a client" }, { status: 403 });
    }
    const body = createSchema.parse(await req.json());
    const result = await clientOrganizationFacade.onboardClient({
      actorUserId: user.id,
      legalName: body.legalName,
      tradeName: body.tradeName,
      countryCode: body.countryCode,
      registrationNumber: body.registrationNumber,
      taxId: body.taxId,
      website: body.website,
      billingCurrency: body.billingCurrency,
      intendedEmployeeCount: body.intendedEmployeeCount,
      proposedNovaCompanyId: body.proposedNovaCompanyId,
      profile: body.profile ?? {},
    });
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error);
  }
}

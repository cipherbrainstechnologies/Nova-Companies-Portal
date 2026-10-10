import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/server/api-helpers";
import { requireSessionUser } from "@/server/auth/session";
import { requireNovaClientAdmin } from "@/server/client/client-authz";
import { clientOrganizationFacade } from "@/server/facades/client-organization-facade";

const createSchema = z.object({
  legalName: z.string().min(2),
  tradeName: z.string().optional(),
  countryCode: z.string().min(2).max(2),
  registrationNumber: z.string().optional(),
  billingCurrency: z.string().optional(),
  intendedEmployeeCount: z.number().int().positive().optional(),
  proposedNovaCompanyId: z.string().optional(),
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
    const body = createSchema.parse(await req.json());
    const client = await clientOrganizationFacade.createProspect({
      actorUserId: user.id,
      ...body,
    });
    return NextResponse.json({ client });
  } catch (error) {
    return apiError(error);
  }
}

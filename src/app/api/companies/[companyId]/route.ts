import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/server/auth/session";
import { authorize, apiError } from "@/server/api-helpers";
import { companyFacade } from "@/server/facades/company-facade";

const patchSchema = z.object({
  companyId: z.string().optional(),
  name: z.string().trim().min(2).max(120).optional(),
  gstin: z.string().trim().max(20).nullable().optional(),
  address: z.string().trim().max(500).nullable().optional(),
  email: z.string().trim().email().max(200).nullable().optional().or(z.literal("")),
  phone: z.string().trim().max(20).nullable().optional().or(z.literal("")),
  isActive: z.boolean().optional(),
  logoKey: z.string().max(500).nullable().optional(),
  autoIssueExactMatches: z.boolean().optional(),
  emailDeliveryPreference: z.enum(["OFFICIAL_PREFERRED", "PERSONAL_PREFERRED", "BOTH"]).optional(),
  matchScoreThreshold: z.number().int().min(0).max(100).optional(),
});
type Context = { params: Promise<{ companyId: string }> };

export async function GET(_: Request, { params }: Context) {
  try {
    const user = await requireSessionUser(); const { companyId } = await params;
    await authorize(user, companyId, "companies", "view");
    return NextResponse.json(await companyFacade.getCompany(companyId));
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const user = await requireSessionUser(); const { companyId } = await params;
    await authorize(user, companyId, "companies", "edit");
    const raw = patchSchema.parse(await request.json());
    const { companyId: bodyScope, ...body } = raw;
    if (bodyScope && bodyScope !== companyId) return NextResponse.json({ error: "Company scope mismatch" }, { status: 403 });
    return NextResponse.json(
      await companyFacade.updateCompany({
        actorUserId: user.id,
        companyId,
        ...body,
        email: body.email === "" ? null : body.email,
        phone: body.phone === "" ? null : body.phone,
      }),
    );
  } catch (error) { return apiError(error); }
}

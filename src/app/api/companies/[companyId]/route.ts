import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/server/auth/session";
import { authorize, apiError } from "@/server/api-helpers";
import { companyFacade } from "@/server/facades/company-facade";

const patchSchema = z.object({
  companyId: z.string().optional(), name: z.string().trim().min(2).max(120).optional(),
  gstin: z.string().trim().max(20).nullable().optional(), address: z.string().trim().max(500).nullable().optional(),
  isActive: z.boolean().optional(), logoKey: z.string().max(500).nullable().optional(),
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
    const { companyId: bodyScope, ...body } = patchSchema.parse(await request.json());
    if (bodyScope && bodyScope !== companyId) return NextResponse.json({ error: "Company scope mismatch" }, { status: 403 });
    return NextResponse.json(await companyFacade.updateCompany({ actorUserId: user.id, companyId, ...body }));
  } catch (error) { return apiError(error); }
}

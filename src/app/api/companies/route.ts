import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/server/auth/session";
import { apiError } from "@/server/api-helpers";
import { AuthzError } from "@/server/rbac/permissions";
import { companyFacade } from "@/server/facades/company-facade";
import { prisma } from "@/server/db";

const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  prefix: z.string().trim().min(1).max(4).regex(/^[A-Za-z0-9]+$/),
  gstin: z.string().trim().max(20).optional(),
  address: z.string().trim().max(500).optional(),
});

export async function GET() {
  try {
    const user = await requireSessionUser();
    if (user.globalRole === "EMPLOYEE") throw new AuthzError();
    const companies = await companyFacade.listCompanies();
    if (user.globalRole === "SUPER_ADMIN") {
      return NextResponse.json({ companies });
    }
    const grants = await prisma.permissionGrant.findMany({
      where: { userId: user.id },
      select: { companyId: true },
    });
    const allowed = new Set(grants.map((g) => g.companyId));
    return NextResponse.json({
      companies: companies.filter((c) => allowed.has(c.id)),
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    if (user.globalRole !== "SUPER_ADMIN") throw new AuthzError();
    const body = createSchema.parse(await request.json());
    const company = await companyFacade.createCompany({
      actorUserId: user.id,
      ...body,
    });
    return NextResponse.json({ company }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

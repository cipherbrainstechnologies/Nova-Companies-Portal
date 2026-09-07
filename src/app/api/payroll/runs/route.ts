import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/server/auth/session";
import { authorize, apiError } from "@/server/api-helpers";
import { payrollFacade } from "@/server/facades/payroll-facade";
import { prisma } from "@/server/db";

const schema = z.object({ companyId: z.string().min(1), year: z.coerce.number().int().min(2000).max(2200), month: z.coerce.number().int().min(1).max(12) });

export async function GET(request: Request) {
  try {
    const user = await requireSessionUser(); const companyId = new URL(request.url).searchParams.get("companyId") ?? "";
    await authorize(user, companyId, "payroll", "view");
    return NextResponse.json(await prisma.payrollRun.findMany({ where: { companyId }, include: { lines: true }, orderBy: [{ year: "desc" }, { month: "desc" }] }));
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser(); const body = schema.parse(await request.json());
    await authorize(user, body.companyId, "payroll", "create");
    return NextResponse.json(await payrollFacade.createPayrollRun({ actorUserId: user.id, ...body }), { status: 201 });
  } catch (error) { return apiError(error); }
}

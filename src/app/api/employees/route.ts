import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/server/auth/session";
import { authorize, apiError } from "@/server/api-helpers";
import { employeeFacade } from "@/server/facades/employee-facade";

const createSchema = z.object({
  companyId: z.string().min(1), firstName: z.string().trim().min(1), lastName: z.string().trim().min(1),
  primaryPhone: z.string().min(10), temporaryPassword: z.string().min(10),
  personalEmail: z.string().email().optional(), officialEmail: z.string().email().optional(),
  designation: z.string().optional(), department: z.string().optional(), location: z.string().optional(),
  alternatePhone: z.string().optional(), pan: z.string().optional(), pfNumber: z.string().optional(),
  uan: z.string().optional(), esiNumber: z.string().optional(), bankName: z.string().optional(),
  accountNumber: z.string().optional(), ifsc: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireSessionUser();
    const companyId = new URL(request.url).searchParams.get("companyId") ?? "";
    await authorize(user, companyId, "employees", "view");
    return NextResponse.json(await employeeFacade.listByCompany(companyId));
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser(); const body = createSchema.parse(await request.json());
    await authorize(user, body.companyId, "employees", "create");
    return NextResponse.json(await employeeFacade.create({ actorUserId: user.id, ...body }), { status: 201 });
  } catch (error) { return apiError(error); }
}

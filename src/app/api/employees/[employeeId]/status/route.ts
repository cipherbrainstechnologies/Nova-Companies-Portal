import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/server/auth/session";
import { authorize, apiError } from "@/server/api-helpers";
import { employeeFacade } from "@/server/facades/employee-facade";

const schema = z.object({ companyId: z.string().min(1), status: z.enum(["ACTIVE", "BLOCKED", "EXITED"]) });

export async function PATCH(request: Request, { params }: { params: Promise<{ employeeId: string }> }) {
  try {
    const user = await requireSessionUser();
    const { employeeId } = await params; const body = schema.parse(await request.json());
    await authorize(user, body.companyId, "employees", "edit");
    await employeeFacade.getById(employeeId, body.companyId);
    return NextResponse.json(await employeeFacade.updateStatus({ actorUserId: user.id, employeeId, status: body.status }));
  } catch (error) { return apiError(error); }
}

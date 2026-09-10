import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/server/auth/session";
import { authorize, apiError } from "@/server/api-helpers";
import { employeeFacade } from "@/server/facades/employee-facade";

const schema = z.object({
  companyId: z.string().min(1),
  employeeIds: z.array(z.string().min(1)).min(1).max(500),
  action: z.enum(["ACTIVE", "BLOCKED", "EXITED"]),
});

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    const body = schema.parse(await request.json());
    await authorize(user, body.companyId, "employees", "edit");
    const result = await employeeFacade.bulkUpdateStatus({
      actorUserId: user.id,
      companyId: body.companyId,
      employeeIds: body.employeeIds,
      status: body.action,
    });
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error);
  }
}

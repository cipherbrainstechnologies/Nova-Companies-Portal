import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/server/auth/session";
import { apiError, authorize } from "@/server/api-helpers";
import { employeeFacade } from "@/server/facades/employee-facade";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ employeeId: string }> },
) {
  try {
    const user = await requireSessionUser();
    const { employeeId } = await params;
    const body = z
      .object({ companyId: z.string().min(1), confirmCode: z.string().min(1) })
      .parse(await request.json());
    await authorize(user, body.companyId, "employees", "edit");
    const employee = await employeeFacade.getById(employeeId, body.companyId);
    if (body.confirmCode.trim().toUpperCase() !== employee.employeeCode.toUpperCase()) {
      throw new Error(`Type the employee code ${employee.employeeCode} to confirm deletion`);
    }
    await employeeFacade.deleteEmployee({
      actorUserId: user.id,
      employeeId,
      companyId: body.companyId,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}

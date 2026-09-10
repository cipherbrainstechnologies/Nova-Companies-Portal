import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/server/auth/session";
import { apiError, authorize } from "@/server/api-helpers";
import { employeeFacade } from "@/server/facades/employee-facade";

const optionalText = z.string().trim().max(200).nullable().optional();
const optionalEmail = z
  .union([z.string().email(), z.literal(""), z.null()])
  .optional()
  .transform((v) => (v === "" || v == null ? null : v));

const updateSchema = z.object({
  companyId: z.string().min(1),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  displayName: optionalText,
  designation: optionalText,
  department: optionalText,
  location: optionalText,
  dateOfJoining: z
    .union([
      z.string().datetime(),
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      z.null(),
    ])
    .optional()
    .transform((v) => {
      if (v == null || v === "") return null;
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) throw new Error("Invalid date of joining");
      return d;
    }),
  pan: optionalText,
  pfNumber: optionalText,
  uan: optionalText,
  esiNumber: optionalText,
  contact: z.object({
    personalEmail: optionalEmail,
    officialEmail: optionalEmail,
    primaryPhone: optionalText,
    alternatePhone: optionalText,
  }),
  bank: z.object({
    bankName: optionalText,
    accountNumber: optionalText,
    ifsc: optionalText,
    accountHolderName: optionalText,
  }),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ employeeId: string }> },
) {
  try {
    const user = await requireSessionUser();
    const { employeeId } = await params;
    const body = updateSchema.parse(await request.json());
    await authorize(user, body.companyId, "employees", "edit");
    const employee = await employeeFacade.updateEmployee({
      actorUserId: user.id,
      employeeId,
      companyId: body.companyId,
      firstName: body.firstName,
      lastName: body.lastName,
      displayName: body.displayName,
      designation: body.designation,
      department: body.department,
      location: body.location,
      dateOfJoining: body.dateOfJoining,
      pan: body.pan,
      pfNumber: body.pfNumber,
      uan: body.uan,
      esiNumber: body.esiNumber,
      contact: body.contact,
      bank: body.bank,
    });
    return NextResponse.json(employee);
  } catch (error) {
    return apiError(error);
  }
}

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

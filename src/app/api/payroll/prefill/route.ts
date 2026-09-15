import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/server/auth/session";
import { authorize, apiError } from "@/server/api-helpers";
import { buildSalarySlipPrefill } from "@/server/payroll/slip-prefill";

const schema = z.object({
  companyId: z.string().min(1),
  employeeId: z.string().min(1),
  year: z.coerce.number().int().min(2000).max(2200),
  month: z.coerce.number().int().min(1).max(12),
  applyParthAug2026CaOverrides: z.boolean().optional(),
  assumeFullAttendance: z.boolean().optional(),
  attendanceConfirmed: z.boolean().optional(),
  cashComponent: z.number().optional(),
  leave: z
    .object({
      casualLeave: z.number().optional(),
      privilegedLeave: z.number().optional(),
      sickLeave: z.number().optional(),
      leaveWithoutPay: z.number().optional(),
      weeklyOffs: z.number().optional(),
      paidHolidays: z.number().optional(),
    })
    .optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    const body = schema.parse(await request.json());
    await authorize(user, body.companyId, "payroll", "view");
    const draft = await buildSalarySlipPrefill(body);
    return NextResponse.json(draft);
  } catch (error) {
    return apiError(error);
  }
}

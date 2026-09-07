import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/server/auth/session";
import { authorize, apiError } from "@/server/api-helpers";
import { payrollFacade } from "@/server/facades/payroll-facade";

const schema = z.object({
  employeeId: z.string().min(1),
  companyId: z.string().min(1),
  year: z.coerce.number().int().min(2000).max(2200),
  month: z.coerce.number().int().min(1).max(12),
  earnings: z.array(
    z.object({
      code: z.string(),
      label: z.string(),
      actual: z.number(),
      payable: z.number(),
    }),
  ),
  deductions: z.array(
    z.object({
      code: z.string(),
      label: z.string(),
      amount: z.number(),
    }),
  ),
  working: z
    .object({
      workingDays: z.number().optional(),
      weeklyOffs: z.number().optional(),
      paidHolidays: z.number().optional(),
      presentDays: z.number().optional(),
      casualLeave: z.number().optional(),
      privilegedLeave: z.number().optional(),
      sickLeave: z.number().optional(),
      leaveWithoutPay: z.number().optional(),
    })
    .optional(),
  cashComponent: z.number().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    const body = schema.parse(await request.json());
    await authorize(user, body.companyId, "payroll", "view");
    const result = await payrollFacade.previewPayslipHtml(body);
    return NextResponse.json({ html: result.html });
  } catch (error) {
    return apiError(error);
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/server/auth/session";
import { apiError, authorizeAny } from "@/server/api-helpers";
import { prisma } from "@/server/db";
import { searchAllocatablePayments } from "@/server/payroll/payment-auto-match";

const schema = z.object({
  companyId: z.string().min(1),
  year: z.coerce.number().int().min(2000).max(2200),
  month: z.coerce.number().int().min(1).max(12),
  q: z.string().trim().max(200).optional(),
  employeeId: z.string().min(1).optional(),
  daysBefore: z.coerce.number().int().min(0).max(90).optional(),
  daysAfter: z.coerce.number().int().min(0).max(90).optional(),
  limit: z.coerce.number().int().min(10).max(100).optional(),
  offset: z.coerce.number().int().min(0).max(5000).optional(),
  includeAllocated: z.coerce.boolean().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireSessionUser();
    const url = new URL(request.url);
    const body = schema.parse({
      companyId: url.searchParams.get("companyId"),
      year: url.searchParams.get("year"),
      month: url.searchParams.get("month"),
      q: url.searchParams.get("q") ?? undefined,
      employeeId: url.searchParams.get("employeeId") ?? undefined,
      daysBefore: url.searchParams.get("daysBefore") ?? undefined,
      daysAfter: url.searchParams.get("daysAfter") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
      offset: url.searchParams.get("offset") ?? undefined,
      includeAllocated: url.searchParams.get("includeAllocated") ?? undefined,
    });

    await authorizeAny(user, body.companyId, [
      ["statements", "reconcile"],
      ["statements", "view"],
      ["payroll", "view"],
      ["payroll", "edit"],
    ]);

    let employeeName: string | undefined;
    if (body.employeeId) {
      const employee = await prisma.employee.findFirst({
        where: { id: body.employeeId, companyId: body.companyId },
        select: { firstName: true, lastName: true, displayName: true },
      });
      if (!employee) {
        return NextResponse.json({ error: "Employee not found in company scope" }, { status: 404 });
      }
      employeeName =
        employee.displayName?.trim() || `${employee.firstName} ${employee.lastName}`.trim();
    }

    const result = await searchAllocatablePayments({
      companyId: body.companyId,
      year: body.year,
      month: body.month,
      query: body.q,
      employeeId: body.employeeId,
      employeeName,
      daysBefore: body.daysBefore,
      daysAfter: body.daysAfter,
      limit: body.limit,
      offset: body.offset,
      includeAllocated: body.includeAllocated,
    });

    return NextResponse.json(result);
  } catch (error) {
    return apiError(error);
  }
}

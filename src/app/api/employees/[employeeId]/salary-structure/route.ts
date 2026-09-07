import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/server/auth/session";
import { apiError, authorizeAny } from "@/server/api-helpers";
import { assertCompanyScope } from "@/server/rbac/permissions";
import { employeeFacade } from "@/server/facades/employee-facade";
import { prisma } from "@/server/db";

const amount = z.number().nonnegative().max(1_000_000_000);

const schema = z.object({
  companyId: z.string().min(1),
  annualCtc: amount.nullable().optional(),
  monthlyGross: amount.nullable().optional(),
  monthlyTds: amount.nullable().optional(),
  monthlyPt: amount.nullable().optional(),
  expectedMonthlyNet: amount.nullable().optional(),
  effectiveFrom: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  components: z.record(z.string().min(1), z.number()).optional(),
  paymentAliases: z.array(z.string().trim().max(120)).max(20).optional(),
  accountHolderName: z.string().trim().max(160).nullable().optional(),
  notes: z.string().trim().max(1_000).optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ employeeId: string }> },
) {
  try {
    const user = await requireSessionUser();
    const { employeeId } = await params;
    const body = schema.parse(await request.json());

    // Prefer the dedicated salary-structure permission; fall back to employees/edit for
    // operators provisioned before the module existed.
    await authorizeAny(user, body.companyId, [
      ["salaryStructure", "edit"],
      ["employees", "edit"],
    ]);

    const employee = await prisma.employee.findUniqueOrThrow({
      where: { id: employeeId },
      select: { companyId: true },
    });
    assertCompanyScope(employee.companyId, body.companyId);

    const structure = await employeeFacade.upsertSalaryStructure({
      actorUserId: user.id,
      employeeId,
      annualCtc: body.annualCtc,
      monthlyGross: body.monthlyGross,
      monthlyTds: body.monthlyTds,
      monthlyPt: body.monthlyPt,
      expectedMonthlyNet: body.expectedMonthlyNet,
      effectiveFrom: body.effectiveFrom ? new Date(body.effectiveFrom) : undefined,
      components: body.components,
      paymentAliases: body.paymentAliases,
      accountHolderName: body.accountHolderName,
      notes: body.notes,
    });

    return NextResponse.json({ structure });
  } catch (error) {
    return apiError(error);
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ employeeId: string }> },
) {
  try {
    const user = await requireSessionUser();
    const { employeeId } = await params;
    const employee = await prisma.employee.findUniqueOrThrow({
      where: { id: employeeId },
      select: { companyId: true },
    });
    await authorizeAny(user, employee.companyId, [
      ["salaryStructure", "view"],
      ["employees", "view"],
    ]);

    const [structure, versions] = await Promise.all([
      prisma.employeeSalaryStructure.findUnique({ where: { employeeId } }),
      employeeFacade.listSalaryStructureVersions(employeeId),
    ]);
    return NextResponse.json({ structure, versions });
  } catch (error) {
    return apiError(error);
  }
}

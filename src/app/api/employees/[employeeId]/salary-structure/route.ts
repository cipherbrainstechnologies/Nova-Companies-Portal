import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/server/auth/session";
import { apiError, authorizeAny } from "@/server/api-helpers";
import { assertCompanyScope } from "@/server/rbac/permissions";
import { employeeFacade } from "@/server/facades/employee-facade";
import { prisma } from "@/server/db";
import { salaryStructureCalculate } from "@/server/payroll/salary-structure-calculator";
import { writeAudit } from "@/server/audit";

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
  financialYear: z.string().optional(),
  regime: z.enum(["NEW", "OLD"]).optional(),
  residentialStatus: z.enum(["RESIDENT", "NON_RESIDENT"]).optional(),
  /** When true, persist client TDS/net only with a reason (authorised override). */
  applyAutomaticCalculation: z.boolean().optional(),
  overrideExpectedNet: z.boolean().optional(),
  overrideReason: z.string().trim().max(500).optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ employeeId: string }> },
) {
  try {
    const user = await requireSessionUser();
    const { employeeId } = await params;
    const body = schema.parse(await request.json());

    await authorizeAny(user, body.companyId, [
      ["salaryStructure", "edit"],
      ["employees", "edit"],
    ]);

    const employee = await prisma.employee.findUniqueOrThrow({
      where: { id: employeeId },
      select: { companyId: true },
    });
    assertCompanyScope(employee.companyId, body.companyId);

    if (body.annualCtc == null) {
      throw new Error("Annual CTC is required");
    }

    const applyAuto = body.applyAutomaticCalculation !== false;
    let monthlyGross = body.monthlyGross ?? null;
    let monthlyTds = body.monthlyTds ?? null;
    let monthlyPt = body.monthlyPt ?? null;
    let expectedMonthlyNet = body.expectedMonthlyNet ?? null;
    let calculationNotes = body.notes ?? "";

    if (applyAuto) {
      const company = await prisma.company.findUnique({
        where: { id: body.companyId },
        select: { defaultMonthlyProfessionalTax: true },
      });
      const companyPt = company?.defaultMonthlyProfessionalTax
        ? Number(company.defaultMonthlyProfessionalTax)
        : 200;
      const calculation = salaryStructureCalculate({
        annualCtc: body.annualCtc,
        monthlyGross: null,
        monthlyProfessionalTax: body.monthlyPt ?? companyPt,
        components: body.components,
        effectiveFrom: body.effectiveFrom,
        financialYear: body.financialYear,
        regime: body.regime,
        residentialStatus: body.residentialStatus,
      });
      monthlyGross = calculation.monthlyGross;
      monthlyTds = calculation.indicativeMonthlyTds;
      monthlyPt = calculation.monthlyProfessionalTax;
      if (body.overrideExpectedNet) {
        if (!body.overrideReason?.trim()) {
          throw new Error("A reason is required to override the calculated expected monthly net");
        }
        expectedMonthlyNet = body.expectedMonthlyNet ?? calculation.expectedMonthlyNetCalculated;
        calculationNotes = [
          calculationNotes,
          `NET OVERRIDE: calculated ₹${calculation.expectedMonthlyNetCalculated}; saved ₹${expectedMonthlyNet}; reason: ${body.overrideReason}`,
        ]
          .filter(Boolean)
          .join("\n");
        await writeAudit({
          actorUserId: user.id,
          companyId: body.companyId,
          action: "salary_structure.net_override",
          entityType: "Employee",
          entityId: employeeId,
          metadata: {
            calculated: calculation.expectedMonthlyNetCalculated,
            override: expectedMonthlyNet,
            reason: body.overrideReason,
          },
        });
      } else {
        expectedMonthlyNet = calculation.expectedMonthlyNetCalculated;
      }
      calculationNotes = [
        calculationNotes,
        `AUTO ${calculation.financialYear} ${calculation.regime}: gross ₹${calculation.monthlyGross}, TDS ₹${calculation.indicativeMonthlyTds}, PT ₹${calculation.monthlyProfessionalTax}, net ₹${calculation.expectedMonthlyNetCalculated}. ${calculation.assumptionBanner}`,
      ]
        .filter(Boolean)
        .join("\n")
        .slice(0, 1000);
    }

    const structure = await employeeFacade.upsertSalaryStructure({
      actorUserId: user.id,
      employeeId,
      annualCtc: body.annualCtc,
      monthlyGross,
      monthlyTds,
      monthlyPt,
      expectedMonthlyNet,
      effectiveFrom: body.effectiveFrom ? new Date(body.effectiveFrom) : undefined,
      components: body.components,
      paymentAliases: body.paymentAliases,
      accountHolderName: body.accountHolderName,
      notes: calculationNotes || undefined,
    });

    // Flag draft payroll lines on this company for the employee so matching uses the new net.
    await prisma.payrollEmployeeLine.updateMany({
      where: {
        employeeId,
        status: "DRAFT",
        payrollRun: {
          companyId: body.companyId,
          status: { in: ["DRAFT", "RECONCILIATION_REQUIRED", "READY_FOR_REVIEW"] },
        },
      },
      data: {
        approvalReason: "Salary structure changed — recalculate / re-match before approval",
      },
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

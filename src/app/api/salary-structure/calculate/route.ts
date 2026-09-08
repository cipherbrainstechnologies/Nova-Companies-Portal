import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/server/auth/session";
import { apiError, authorizeAny } from "@/server/api-helpers";
import { prisma } from "@/server/db";
import {
  DEFAULT_MONTHLY_PROFESSIONAL_TAX,
  salaryStructureCalculate,
} from "@/server/payroll/salary-structure-calculator";
import { listEnabledTaxYears } from "@/server/tds/tax-year-config";

const schema = z.object({
  companyId: z.string().min(1),
  annualCtc: z.number().nonnegative().max(1_000_000_000),
  monthlyGross: z.number().nonnegative().nullable().optional(),
  monthlyProfessionalTax: z.number().nonnegative().nullable().optional(),
  otherMonthlyDeductions: z.number().nonnegative().optional(),
  components: z.record(z.string(), z.number()).nullable().optional(),
  effectiveFrom: z.string().optional(),
  financialYear: z.string().optional(),
  regime: z.enum(["NEW", "OLD"]).optional(),
  residentialStatus: z.enum(["RESIDENT", "NON_RESIDENT"]).optional(),
  tdsDeductedYtd: z.number().nonnegative().optional(),
  monthsElapsed: z.number().int().min(0).max(11).optional(),
  previousEmployerIncome: z.number().nonnegative().optional(),
  previousEmployerTds: z.number().nonnegative().optional(),
  otherAnnualIncome: z.number().nonnegative().optional(),
  otherDeductions: z.number().nonnegative().optional(),
  hasSpecialRateIncome: z.boolean().optional(),
  preserveMonthlyTds: z.number().nonnegative().nullable().optional(),
  preserveExpectedNet: z.number().nullable().optional(),
});

export async function GET() {
  try {
    await requireSessionUser();
    return NextResponse.json({ taxYears: listEnabledTaxYears() });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    const body = schema.parse(await request.json());
    await authorizeAny(user, body.companyId, [
      ["salaryStructure", "view"],
      ["salaryStructure", "edit"],
      ["employees", "view"],
      ["employees", "edit"],
      ["tds", "view"],
    ]);
    const company = await prisma.company.findUnique({
      where: { id: body.companyId },
      select: { defaultMonthlyProfessionalTax: true },
    });
    const companyPt = company?.defaultMonthlyProfessionalTax
      ? Number(company.defaultMonthlyProfessionalTax)
      : DEFAULT_MONTHLY_PROFESSIONAL_TAX;
    const calculation = salaryStructureCalculate({
      ...body,
      monthlyProfessionalTax: body.monthlyProfessionalTax ?? companyPt,
    });
    return NextResponse.json({ calculation });
  } catch (error) {
    return apiError(error);
  }
}

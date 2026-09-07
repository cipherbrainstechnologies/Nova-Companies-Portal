import { NextResponse } from "next/server";
import { requireSessionUser } from "@/server/auth/session";
import { apiError, authorize } from "@/server/api-helpers";
import { payrollFacade } from "@/server/facades/payroll-facade";
import { prisma } from "@/server/db";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ payslipId: string }> },
) {
  try {
    const user = await requireSessionUser();
    const { payslipId } = await params;
    const payslip = await prisma.payslip.findUniqueOrThrow({
      where: { id: payslipId },
      select: { companyId: true },
    });
    await authorize(user, payslip.companyId, "payslips", "resendEmail");

    const deliveries = await payrollFacade.resendPayslipEmail({
      actorUserId: user.id,
      payslipId,
    });
    return NextResponse.json(
      { queued: deliveries.length, deliveries: deliveries.map((d) => ({ id: d.id, toEmail: d.toEmail })) },
      { status: 202 },
    );
  } catch (error) {
    return apiError(error);
  }
}

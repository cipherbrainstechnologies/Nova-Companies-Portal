import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/server/auth/session";
import {
  AuthError,
  AuthzError,
  requireEmployeeOwnsPayslip,
  requirePermission,
} from "@/server/rbac/permissions";
import { prisma } from "@/server/db";
import { getSignedDownloadUrl } from "@/server/storage/s3";
import { writeAudit } from "@/server/audit";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ payslipId: string }> },
) {
  try {
    const user = await requireSessionUser();
    const { payslipId } = await ctx.params;
    const slip = await prisma.payslip.findUniqueOrThrow({
      where: { id: payslipId },
      include: {
        versions: {
          where: { sha256: { not: null } },
          orderBy: { version: "desc" },
          take: 1,
          include: { pdfFile: true },
        },
      },
    });

    if (user.globalRole === "EMPLOYEE") {
      await requireEmployeeOwnsPayslip({ user, payslipEmployeeId: slip.employeeId });
    } else {
      await requirePermission({
        user,
        companyId: slip.companyId,
        module: "payslips",
        action: "download",
      });
    }

    if (slip.status !== "ISSUED" || !slip.versions[0]?.pdfFile) {
      return NextResponse.json({ error: "Payslip not available" }, { status: 404 });
    }

    const url = await getSignedDownloadUrl(slip.versions[0].pdfFile.storageKey, 120);
    await prisma.documentDownloadAudit.create({
      data: {
        payslipId: slip.id,
        userId: user.id,
        ipAddress: req.headers.get("x-forwarded-for"),
        userAgent: req.headers.get("user-agent"),
      },
    });
    await writeAudit({
      actorUserId: user.id,
      companyId: slip.companyId,
      action: "payslip.download",
      entityType: "Payslip",
      entityId: slip.id,
    });
    return NextResponse.json({ url });
  } catch (err) {
    if (err instanceof AuthError || err instanceof AuthzError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

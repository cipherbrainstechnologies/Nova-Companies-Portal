import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/server/auth/session";
import { authorize, apiError } from "@/server/api-helpers";
import { prisma } from "@/server/db";
import { getSignedDownloadUrl } from "@/server/storage/s3";
import { writeAudit } from "@/server/audit";
import type { SessionUser } from "@/server/rbac/permissions";

const querySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2200),
  month: z.coerce.number().int().min(1).max(12),
});

type Context = { params: Promise<{ companyId: string }> };

/**
 * No zip library in dependencies — returns short-lived signed download URLs for
 * issued payslips in the selected month so the client can download each PDF.
 */
async function buildBulkDownload(
  request: NextRequest,
  user: SessionUser,
  companyId: string,
  year: number,
  month: number,
) {
  const slips = await prisma.payslip.findMany({
    where: {
      companyId,
      status: "ISSUED",
      payrollRun: { year, month },
    },
    include: {
      employee: { select: { employeeCode: true, firstName: true, lastName: true } },
      versions: {
        where: { sha256: { not: null } },
        orderBy: { version: "desc" },
        take: 1,
        include: { pdfFile: true },
      },
    },
    orderBy: { employee: { employeeCode: "asc" } },
  });

  const items: Array<{
    payslipId: string;
    employeeCode: string;
    employeeName: string;
    url: string;
    fileName: string;
  }> = [];

  for (const slip of slips) {
    const pdf = slip.versions[0]?.pdfFile;
    if (!pdf) continue;
    const url = await getSignedDownloadUrl(pdf.storageKey, 180);
    items.push({
      payslipId: slip.id,
      employeeCode: slip.employee.employeeCode,
      employeeName: `${slip.employee.firstName} ${slip.employee.lastName}`,
      url,
      fileName: pdf.originalName,
    });
    await prisma.documentDownloadAudit.create({
      data: {
        payslipId: slip.id,
        userId: user.id,
        ipAddress: request.headers.get("x-forwarded-for"),
        userAgent: request.headers.get("user-agent"),
      },
    });
  }

  await writeAudit({
    actorUserId: user.id,
    companyId,
    action: "payslip.bulk_download",
    entityType: "Company",
    entityId: companyId,
    metadata: { year, month, count: items.length },
  });

  return { year, month, count: items.length, items };
}

export async function GET(request: NextRequest, { params }: Context) {
  try {
    const user = await requireSessionUser();
    const { companyId } = await params;
    await authorize(user, companyId, "payslips", "download");
    const { year, month } = querySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams.entries()),
    );
    return NextResponse.json(await buildBulkDownload(request, user, companyId, year, month));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest, { params }: Context) {
  try {
    const user = await requireSessionUser();
    const { companyId } = await params;
    await authorize(user, companyId, "payslips", "download");
    const body = querySchema.parse(await request.json());
    return NextResponse.json(
      await buildBulkDownload(request, user, companyId, body.year, body.month),
    );
  } catch (error) {
    return apiError(error);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/server/api-helpers";
import { requireSessionUser } from "@/server/auth/session";
import { requireClientCapability } from "@/server/client/client-authz";
import { assertClientPortalActor } from "@/server/client/mutation-guard";
import {
  approvePayrollEstimate,
  submitPayrollInputs,
} from "@/server/client/payroll-client-service";
import { prisma } from "@/server/db";

const submitSchema = z.object({
  action: z.enum(["submit", "approve"]),
  periodYear: z.number().int(),
  periodMonth: z.number().int().min(1).max(12),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ clientSlug: string }> },
) {
  try {
    const { clientSlug } = await ctx.params;
    const user = await requireSessionUser();
    const membership = await requireClientCapability({
      user,
      clientSlug,
      module: "payroll",
      action: "VIEW",
    });
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() + 1;
    const approval = await prisma.clientPayrollApproval.findUnique({
      where: {
        clientOrganizationId_periodYear_periodMonth: {
          clientOrganizationId: membership.clientOrganizationId,
          periodYear: year,
          periodMonth: month,
        },
      },
    });
    const funding = await prisma.payrollFundingRequest.findFirst({
      where: {
        clientOrganizationId: membership.clientOrganizationId,
        periodYear: year,
        periodMonth: month,
      },
    });
    return NextResponse.json({ approval, funding, periodYear: year, periodMonth: month });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ clientSlug: string }> },
) {
  try {
    const { clientSlug } = await ctx.params;
    const user = await requireSessionUser();
    const body = submitSchema.parse(await req.json());
    const membership = await requireClientCapability({
      user,
      clientSlug,
      module: "payroll",
      action: body.action === "approve" ? "APPROVE" : "SUBMIT",
    });
    assertClientPortalActor(membership);

    if (body.action === "submit") {
      const approval = await submitPayrollInputs({
        clientOrganizationId: membership.clientOrganizationId,
        membershipId: membership.id,
        periodYear: body.periodYear,
        periodMonth: body.periodMonth,
        payload: body.payload ?? {},
      });
      return NextResponse.json({ approval });
    }

    const approval = await approvePayrollEstimate({
      clientOrganizationId: membership.clientOrganizationId,
      membershipId: membership.id,
      periodYear: body.periodYear,
      periodMonth: body.periodMonth,
    });
    return NextResponse.json({ approval });
  } catch (error) {
    return apiError(error);
  }
}

import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { writeClientActivity } from "@/server/client/client-audit";

export async function submitPayrollInputs(input: {
  clientOrganizationId: string;
  membershipId: string;
  periodYear: number;
  periodMonth: number;
  payload: Record<string, unknown>;
}) {
  const approval = await prisma.clientPayrollApproval.upsert({
    where: {
      clientOrganizationId_periodYear_periodMonth: {
        clientOrganizationId: input.clientOrganizationId,
        periodYear: input.periodYear,
        periodMonth: input.periodMonth,
      },
    },
    create: {
      clientOrganizationId: input.clientOrganizationId,
      periodYear: input.periodYear,
      periodMonth: input.periodMonth,
      status: "SUBMITTED",
      estimateJson: input.payload as Prisma.InputJsonValue,
    },
    update: {
      status: "SUBMITTED",
      estimateJson: input.payload as Prisma.InputJsonValue,
    },
  });

  await prisma.clientApprovalTask.create({
    data: {
      clientOrganizationId: input.clientOrganizationId,
      taskType: "PAYROLL_INPUT",
      title: `Payroll inputs ${input.periodMonth}/${input.periodYear}`,
      payloadJson: input.payload as Prisma.InputJsonValue,
      assigneeMembershipId: input.membershipId,
    },
  });

  await writeClientActivity({
    clientOrganizationId: input.clientOrganizationId,
    action: "payroll.inputs_submitted",
    entityType: "ClientPayrollApproval",
    entityId: approval.id,
  });

  return approval;
}

export async function approvePayrollEstimate(input: {
  clientOrganizationId: string;
  membershipId: string;
  periodYear: number;
  periodMonth: number;
}) {
  const approval = await prisma.clientPayrollApproval.update({
    where: {
      clientOrganizationId_periodYear_periodMonth: {
        clientOrganizationId: input.clientOrganizationId,
        periodYear: input.periodYear,
        periodMonth: input.periodMonth,
      },
    },
    data: {
      status: "CLIENT_APPROVED",
      approvedAt: new Date(),
      approvedByMembershipId: input.membershipId,
    },
  });

  const existingFunding = await prisma.payrollFundingRequest.findFirst({
    where: {
      clientOrganizationId: input.clientOrganizationId,
      periodYear: input.periodYear,
      periodMonth: input.periodMonth,
    },
  });
  if (!existingFunding) {
    await prisma.payrollFundingRequest.create({
      data: {
        clientOrganizationId: input.clientOrganizationId,
        periodYear: input.periodYear,
        periodMonth: input.periodMonth,
        amount: "0",
        currency: "GBP",
        status: "REQUESTED",
        dueAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      },
    });
  } else {
    await prisma.payrollFundingRequest.update({
      where: { id: existingFunding.id },
      data: { status: "REQUESTED" },
    });
  }

  return approval;
}

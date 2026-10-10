import { prisma } from "@/server/db";
import { getClientVisibleEmployeeCosts } from "@/server/client/cost-visibility";
import type { ClientPortalRole } from "@prisma/client";

export async function getClientOverview(input: {
  clientOrganizationId: string;
  portalRole: ClientPortalRole;
}) {
  const now = new Date();
  const periodYear = now.getUTCFullYear();
  const periodMonth = now.getUTCMonth() + 1;

  const [assignments, pendingHires, openApprovals, costs] = await Promise.all([
    prisma.employmentAssignment.count({
      where: { clientOrganizationId: input.clientOrganizationId, status: "ACTIVE" },
    }),
    prisma.hireRequest.count({
      where: {
        clientOrganizationId: input.clientOrganizationId,
        status: { notIn: ["ACTIVE", "REJECTED", "WITHDRAWN"] },
      },
    }),
    prisma.clientApprovalTask.count({
      where: { clientOrganizationId: input.clientOrganizationId, status: "OPEN" },
    }),
    getClientVisibleEmployeeCosts({
      clientOrganizationId: input.clientOrganizationId,
      portalRole: input.portalRole,
      periodYear,
      periodMonth,
    }),
  ]);

  const forecastTotal = costs.reduce((sum, row) => {
    const v = row.totalEmployerCost ? Number(row.totalEmployerCost) : 0;
    return sum + (Number.isFinite(v) ? v : 0);
  }, 0);

  const payrollApproval = await prisma.clientPayrollApproval.findUnique({
    where: {
      clientOrganizationId_periodYear_periodMonth: {
        clientOrganizationId: input.clientOrganizationId,
        periodYear,
        periodMonth,
      },
    },
  });

  return {
    periodYear,
    periodMonth,
    activeEmployees: assignments,
    pendingOnboarding: pendingHires,
    openApprovals,
    forecastTotal,
    payrollStatus: payrollApproval?.status ?? "NOT_STARTED",
  };
}

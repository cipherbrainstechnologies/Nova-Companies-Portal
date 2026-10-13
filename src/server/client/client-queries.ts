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

  const [payrollApproval, pricing, tasks, employees] = await Promise.all([
    prisma.clientPayrollApproval.findUnique({
      where: {
        clientOrganizationId_periodYear_periodMonth: {
          clientOrganizationId: input.clientOrganizationId,
          periodYear,
          periodMonth,
        },
      },
    }),
    prisma.clientPricingAgreement.findFirst({
      where: {
        clientOrganizationId: input.clientOrganizationId,
        effectiveTo: null,
        effectiveFrom: { lte: now },
      },
      orderBy: { version: "desc" },
    }),
    prisma.clientApprovalTask.findMany({
      where: { clientOrganizationId: input.clientOrganizationId, status: "OPEN" },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, title: true, taskType: true },
    }),
    prisma.employmentAssignment.findMany({
      where: { clientOrganizationId: input.clientOrganizationId },
      orderBy: { effectiveFrom: "desc" },
      take: 6,
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, displayName: true, designation: true, dateOfJoining: true, company: { select: { name: true } } } },
      },
    }),
  ]);

  const feePerEmployee = pricing ? Number(pricing.feePerEmployee) : null;
  const monthlyServiceFee = feePerEmployee != null && Number.isFinite(feePerEmployee) ? feePerEmployee * assignments : null;

  return {
    periodYear,
    periodMonth,
    activeEmployees: assignments,
    pendingOnboarding: pendingHires,
    openApprovals,
    forecastTotal,
    payrollStatus: payrollApproval?.status ?? "NOT_STARTED",
    serviceFee: monthlyServiceFee,
    serviceFeeCurrency: pricing?.currency ?? null,
    tasks,
    employees: employees.map((row) => ({
      id: row.employee.id,
      name: row.employee.displayName ?? `${row.employee.firstName} ${row.employee.lastName}`,
      designation: row.employee.designation,
      status: row.status,
      legalEmployer: row.employee.company.name,
      startDate: row.employee.dateOfJoining?.toISOString().slice(0, 10) ?? null,
    })),
  };
}

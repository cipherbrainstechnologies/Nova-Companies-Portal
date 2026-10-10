import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "@/server/db";
import { resolveExpectedMonthlyNet } from "@/server/payroll/salary-structure";
import { getClientVisibleEmployeeCosts } from "@/server/client/cost-visibility";

export async function freezeEmployerCostSnapshots(input: {
  clientOrganizationId: string;
  periodYear: number;
  periodMonth: number;
  actorUserId: string;
}) {
  const costs = await getClientVisibleEmployeeCosts({
    clientOrganizationId: input.clientOrganizationId,
    portalRole: "OWNER_ADMIN",
    periodYear: input.periodYear,
    periodMonth: input.periodMonth,
  });

  const assignments = await prisma.employmentAssignment.findMany({
    where: { clientOrganizationId: input.clientOrganizationId, status: "ACTIVE" },
  });

  for (const row of costs) {
    const assignment = assignments.find((a) => a.employeeId === row.employeeId);
    if (!assignment) continue;

    const employee = await prisma.employee.findUnique({
      where: { id: row.employeeId },
      include: { salaryStructure: true },
    });
    const net = employee?.salaryStructure
      ? resolveExpectedMonthlyNet(employee.salaryStructure)
      : null;

    const existing = await prisma.employerCostSnapshot.findUnique({
      where: {
        clientOrganizationId_employeeId_periodYear_periodMonth: {
          clientOrganizationId: input.clientOrganizationId,
          employeeId: row.employeeId,
          periodYear: input.periodYear,
          periodMonth: input.periodMonth,
        },
      },
    });
    if (existing?.isImmutable) continue;

    await prisma.employerCostSnapshot.upsert({
      where: {
        clientOrganizationId_employeeId_periodYear_periodMonth: {
          clientOrganizationId: input.clientOrganizationId,
          employeeId: row.employeeId,
          periodYear: input.periodYear,
          periodMonth: input.periodMonth,
        },
      },
      create: {
        clientOrganizationId: input.clientOrganizationId,
        employeeId: row.employeeId,
        novaCompanyId: assignment.novaCompanyId,
        periodYear: input.periodYear,
        periodMonth: input.periodMonth,
        currency: row.currency,
        breakdownJson: {
          grossSalary: row.grossSalary ?? "0",
          employerStatutory: row.employerStatutory ?? "0",
          eorServiceFee: row.eorServiceFee ?? "0",
          fxCharges: row.fxCharges ?? "0",
          totalEmployerCost: row.totalEmployerCost ?? "0",
          netTakeHome: net != null ? String(net) : row.netTakeHome ?? "0",
          assumptions: row.assumptions,
          frozenBy: input.actorUserId,
          frozenAt: new Date().toISOString(),
        },
        isImmutable: true,
      },
      update: {},
    });
  }

  return { count: costs.length };
}

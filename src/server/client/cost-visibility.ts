import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "@/server/db";
import { resolveExpectedMonthlyNet } from "@/server/payroll/salary-structure";
import type { ClientPortalRole } from "@prisma/client";

export type ClientVisibleEmployeeCost = {
  employeeId: string;
  employeeCode: string;
  displayName: string;
  employerEntity: string;
  periodYear: number;
  periodMonth: number;
  currency: string;
  grossSalary?: string;
  employerStatutory?: string;
  eorServiceFee?: string;
  fxCharges?: string;
  totalEmployerCost?: string;
  netTakeHome?: string;
  assumptions: string[];
  isEstimate: boolean;
};

function canSeeCompensation(role: ClientPortalRole): boolean {
  return role === "OWNER_ADMIN" || role === "HR_MANAGER" || role === "FINANCE";
}

/** Builds client-safe cost rows from immutable snapshots or salary structure estimates. */
export async function getClientVisibleEmployeeCosts(input: {
  clientOrganizationId: string;
  portalRole: ClientPortalRole;
  periodYear: number;
  periodMonth: number;
}): Promise<ClientVisibleEmployeeCost[]> {
  const assignments = await prisma.employmentAssignment.findMany({
    where: { clientOrganizationId: input.clientOrganizationId, status: "ACTIVE" },
    include: {
      employee: {
        include: { company: true, salaryStructure: true },
      },
    },
  });

  const pricing = await prisma.clientPricingAgreement.findFirst({
    where: { clientOrganizationId: input.clientOrganizationId, effectiveTo: null },
    orderBy: { version: "desc" },
  });

  const showMoney = canSeeCompensation(input.portalRole);
  const results: ClientVisibleEmployeeCost[] = [];

  for (const a of assignments) {
    const snap = await prisma.employerCostSnapshot.findUnique({
      where: {
        clientOrganizationId_employeeId_periodYear_periodMonth: {
          clientOrganizationId: input.clientOrganizationId,
          employeeId: a.employeeId,
          periodYear: input.periodYear,
          periodMonth: input.periodMonth,
        },
      },
    });

    const name =
      a.employee.displayName ??
      `${a.employee.firstName} ${a.employee.lastName}`.trim();

    if (snap) {
      const b = snap.breakdownJson as Record<string, string>;
      results.push({
        employeeId: a.employeeId,
        employeeCode: a.employee.employeeCode,
        displayName: name,
        employerEntity: a.employee.company.name,
        periodYear: input.periodYear,
        periodMonth: input.periodMonth,
        currency: snap.currency,
        grossSalary: showMoney ? b.grossSalary : undefined,
        employerStatutory: showMoney ? b.employerStatutory : undefined,
        eorServiceFee: showMoney ? b.eorServiceFee : undefined,
        fxCharges: showMoney ? b.fxCharges : undefined,
        totalEmployerCost: showMoney ? b.totalEmployerCost : undefined,
        netTakeHome: showMoney ? b.netTakeHome : undefined,
        assumptions:
          b.assumptions && Array.isArray(b.assumptions)
            ? (b.assumptions as string[])
            : ["Frozen snapshot"],
        isEstimate: false,
      });
      continue;
    }

    const assumptions = ["Provisional estimate from current salary structure"];
    let gross: Decimal | null = null;
    let net: Decimal | null = null;
    if (a.employee.salaryStructure) {
      gross = a.employee.salaryStructure.monthlyGross;
      const resolvedNet = resolveExpectedMonthlyNet(a.employee.salaryStructure);
      net = resolvedNet != null ? new Decimal(resolvedNet) : null;
    }

    const fee = pricing?.feePerEmployee ?? new Decimal(0);
    const grossStr = gross?.toFixed(2) ?? "0.00";
    const statutory = gross ? gross.mul(new Decimal("0.13")).toFixed(2) : "0.00";
    const total = gross
      ? gross.plus(new Decimal(statutory)).plus(fee).toFixed(2)
      : fee.toFixed(2);

    results.push({
      employeeId: a.employeeId,
      employeeCode: a.employee.employeeCode,
      displayName: name,
      employerEntity: a.employee.company.name,
      periodYear: input.periodYear,
      periodMonth: input.periodMonth,
      currency: pricing?.currency ?? "INR",
      grossSalary: showMoney ? grossStr : undefined,
      employerStatutory: showMoney ? statutory : undefined,
      eorServiceFee: showMoney ? fee.toFixed(2) : undefined,
      fxCharges: showMoney ? "0.00" : undefined,
      totalEmployerCost: showMoney ? total : undefined,
      netTakeHome: showMoney ? net?.toFixed(2) : undefined,
      assumptions,
      isEstimate: true,
    });
  }

  return results;
}

export function maskPan(pan: string | null | undefined): string | null {
  if (!pan || pan.length < 4) return null;
  return `XXXXX${pan.slice(-4)}`;
}

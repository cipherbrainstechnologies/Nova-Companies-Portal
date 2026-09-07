import type { EmailDeliveryPreference } from "@prisma/client";
import { prisma } from "@/server/db";
import { writeAudit } from "@/server/audit";

export class CompanyFacade {
  async listCompanies() {
    return prisma.company.findMany({ orderBy: { name: "asc" } });
  }

  async getCompany(companyId: string) {
    return prisma.company.findUniqueOrThrow({ where: { id: companyId } });
  }

  async createCompany(input: {
    actorUserId: string;
    name: string;
    prefix: string;
    gstin?: string;
    address?: string;
  }) {
    const company = await prisma.$transaction(async (tx) => {
      const c = await tx.company.create({
        data: {
          name: input.name,
          prefix: input.prefix.toUpperCase(),
          gstin: input.gstin,
          address: input.address,
        },
      });
      await tx.companySequence.create({ data: { companyId: c.id, nextNumber: 1 } });
      return c;
    });

    await writeAudit({
      actorUserId: input.actorUserId,
      companyId: company.id,
      action: "company.create",
      entityType: "Company",
      entityId: company.id,
      metadata: { name: company.name, prefix: company.prefix },
    });

    return company;
  }

  async updateCompany(input: {
    actorUserId: string;
    companyId: string;
    name?: string;
    gstin?: string | null;
    address?: string | null;
    isActive?: boolean;
    logoKey?: string | null;
    autoIssueExactMatches?: boolean;
    emailDeliveryPreference?: EmailDeliveryPreference;
    matchScoreThreshold?: number;
  }) {
    if (
      input.matchScoreThreshold != null &&
      (input.matchScoreThreshold < 0 || input.matchScoreThreshold > 100)
    ) {
      throw new Error("Match score threshold must be between 0 and 100");
    }
    const company = await prisma.company.update({
      where: { id: input.companyId },
      data: {
        name: input.name,
        gstin: input.gstin,
        address: input.address,
        isActive: input.isActive,
        logoKey: input.logoKey,
        autoIssueExactMatches: input.autoIssueExactMatches,
        emailDeliveryPreference: input.emailDeliveryPreference,
        matchScoreThreshold: input.matchScoreThreshold,
      },
    });
    await writeAudit({
      actorUserId: input.actorUserId,
      companyId: company.id,
      action: "company.update",
      entityType: "Company",
      entityId: company.id,
    });
    return company;
  }

  /** Allocates next immutable employee code: PREFIX-0001 */
  async allocateEmployeeCode(companyId: string): Promise<string> {
    return prisma.$transaction(async (tx) => {
      const seq = await tx.companySequence.findUniqueOrThrow({ where: { companyId } });
      const company = await tx.company.findUniqueOrThrow({ where: { id: companyId } });
      const code = `${company.prefix}-${String(seq.nextNumber).padStart(4, "0")}`;
      await tx.companySequence.update({
        where: { companyId },
        data: { nextNumber: seq.nextNumber + 1 },
      });
      return code;
    });
  }
}

export const companyFacade = new CompanyFacade();

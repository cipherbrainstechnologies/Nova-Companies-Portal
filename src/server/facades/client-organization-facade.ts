import { createHash, randomBytes } from "node:crypto";
import type { ClientOrganizationStatus, ClientPortalRole, Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { writeAudit } from "@/server/audit";
import { hashToken } from "@/server/auth/crypto";
import { slugifyClientName, withUniqueSuffix } from "@/server/client/slug";
import { canActivateClient } from "@/server/client/activation";
import { writeClientActivity } from "@/server/client/client-audit";

export const clientOrganizationFacade = {
  async listClients() {
    return prisma.clientOrganization.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        proposedNovaCompany: { select: { id: true, name: true, prefix: true } },
        memberships: { where: { status: "ACTIVE" }, select: { id: true } },
        employmentAssignments: { where: { status: "ACTIVE" }, select: { id: true } },
      },
    });
  },

  async getClient(clientId: string) {
    return prisma.clientOrganization.findUnique({
      where: { id: clientId },
      include: {
        proposedNovaCompany: true,
        onboardingCases: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { kybDocuments: true, complianceReviews: { orderBy: { createdAt: "desc" }, take: 3 } },
        },
        novaAgreements: {
          include: { signatureEnvelopes: true, documents: true },
        },
        pricingAgreements: { orderBy: { version: "desc" }, take: 3 },
        employmentAssignments: {
          include: {
            employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true, status: true } },
          },
        },
      },
    });
  },

  async createProspect(input: {
    actorUserId: string;
    legalName: string;
    tradeName?: string;
    countryCode: string;
    registrationNumber?: string;
    billingCurrency?: string;
    intendedEmployeeCount?: number;
    proposedNovaCompanyId?: string;
  }) {
    const baseSlug = slugifyClientName(input.legalName);
    const suffix = randomBytes(3).toString("hex");
    const slug = withUniqueSuffix(baseSlug, suffix);

    const duplicate = await prisma.clientOrganization.findFirst({
      where: {
        legalName: { equals: input.legalName, mode: "insensitive" },
        countryCode: input.countryCode,
      },
    });
    if (duplicate) {
      throw new Error("A client with this legal name and country already exists");
    }

    const client = await prisma.clientOrganization.create({
      data: {
        slug,
        legalName: input.legalName,
        tradeName: input.tradeName,
        countryCode: input.countryCode,
        registrationNumber: input.registrationNumber,
        billingCurrency: input.billingCurrency ?? "GBP",
        intendedEmployeeCount: input.intendedEmployeeCount,
        proposedNovaCompanyId: input.proposedNovaCompanyId,
        lifecycleStatus: "DRAFT",
        onboardingCases: {
          create: {
            status: "DRAFT",
            checklistJson: { steps: defaultOnboardingSteps() },
          },
        },
      },
    });

    await writeAudit({
      actorUserId: input.actorUserId,
      action: "client.create",
      entityType: "ClientOrganization",
      entityId: client.id,
      metadata: { slug: client.slug },
    });

    return client;
  },

  async updateLifecycle(input: {
    actorUserId: string;
    clientId: string;
    status: ClientOrganizationStatus;
    reason?: string;
  }) {
    if (input.status === "ACTIVE") {
      const { ok, blockers } = await canActivateClient(input.clientId);
      if (!ok) {
        throw new Error(`Activation blocked: ${blockers.map((b) => b.code).join(", ")}`);
      }
    }

    const updated = await prisma.clientOrganization.update({
      where: { id: input.clientId },
      data: { lifecycleStatus: input.status },
    });

    await writeAudit({
      actorUserId: input.actorUserId,
      action: "client.lifecycle",
      entityType: "ClientOrganization",
      entityId: input.clientId,
      metadata: { status: input.status, reason: input.reason },
    });

    return updated;
  },

  async recordKybReview(input: {
    actorUserId: string;
    clientId: string;
    outcome: "APPROVED" | "REJECTED" | "CHANGES_REQUESTED";
    riskRating?: string;
    notes?: string;
  }) {
    const caseRow = await prisma.clientOnboardingCase.findFirst({
      where: { clientOrganizationId: input.clientId },
      orderBy: { createdAt: "desc" },
    });
    if (!caseRow) throw new Error("Onboarding case missing");

    await prisma.clientComplianceReview.create({
      data: {
        onboardingCaseId: caseRow.id,
        outcome: input.outcome,
        riskRating: input.riskRating,
        notes: input.notes,
        reviewerUserId: input.actorUserId,
      },
    });

    const statusMap: Record<string, ClientOrganizationStatus> = {
      APPROVED: "CONTRACT_PENDING",
      REJECTED: "REJECTED",
      CHANGES_REQUESTED: "CHANGES_REQUESTED",
    };

    await prisma.clientOrganization.update({
      where: { id: input.clientId },
      data: { lifecycleStatus: statusMap[input.outcome], riskRating: input.riskRating },
    });

    await writeAudit({
      actorUserId: input.actorUserId,
      action: "client.kyb_review",
      entityType: "ClientOrganization",
      entityId: input.clientId,
      metadata: { outcome: input.outcome },
    });
  },

  async createAgreementShell(input: {
    actorUserId: string;
    clientId: string;
    novaCompanyId: string;
    contractVersion: string;
  }) {
    const agreement = await prisma.novaEntityClientAgreement.create({
      data: {
        clientOrganizationId: input.clientId,
        novaCompanyId: input.novaCompanyId,
        contractVersion: input.contractVersion,
        effectiveFrom: new Date(),
        approvedByUserId: input.actorUserId,
        signatureEnvelopes: {
          create: {
            status: "DRAFT",
            documentSha256: createHash("sha256").update(`${input.clientId}:${input.contractVersion}`).digest("hex"),
          },
        },
      },
    });
    return agreement;
  },

  async markAgreementSigned(input: {
    actorUserId: string;
    clientId: string;
    envelopeId: string;
    signerName: string;
    signerEmail: string;
  }) {
    const envelope = await prisma.signatureEnvelope.findFirst({
      where: { id: input.envelopeId, agreement: { clientOrganizationId: input.clientId } },
    });
    if (!envelope) throw new Error("Envelope not found");

    await prisma.$transaction([
      prisma.signatureEvent.create({
        data: {
          envelopeId: envelope.id,
          signerName: input.signerName,
          signerEmail: input.signerEmail,
          signedAt: new Date(),
          evidenceJson: { provider: envelope.provider },
        },
      }),
      prisma.signatureEnvelope.update({
        where: { id: envelope.id },
        data: { status: "COMPLETED", completedAt: new Date() },
      }),
      prisma.clientOrganization.update({
        where: { id: input.clientId },
        data: { lifecycleStatus: "COMPLIANCE_REVIEW" },
      }),
    ]);
  },

  async upsertPricing(input: {
    actorUserId: string;
    clientId: string;
    currency: string;
    feePerEmployee: string;
    setupFee?: string;
  }) {
    const latest = await prisma.clientPricingAgreement.findFirst({
      where: { clientOrganizationId: input.clientId },
      orderBy: { version: "desc" },
    });
    const version = (latest?.version ?? 0) + 1;
    await prisma.clientPricingAgreement.updateMany({
      where: { clientOrganizationId: input.clientId, effectiveTo: null },
      data: { effectiveTo: new Date() },
    });
    return prisma.clientPricingAgreement.create({
      data: {
        clientOrganizationId: input.clientId,
        version,
        currency: input.currency,
        feePerEmployee: input.feePerEmployee,
        setupFee: input.setupFee,
        effectiveFrom: new Date(),
        approvedByUserId: input.actorUserId,
      },
    });
  },

  async inviteClientUser(input: {
    actorUserId: string;
    clientId: string;
    email: string;
    portalRole: ClientPortalRole;
  }) {
    const token = randomBytes(32).toString("hex");
    const invite = await prisma.clientInvitation.create({
      data: {
        clientOrganizationId: input.clientId,
        email: input.email.toLowerCase(),
        portalRole: input.portalRole,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        invitedByUserId: input.actorUserId,
      },
    });
    await writeClientActivity({
      clientOrganizationId: input.clientId,
      actorUserId: input.actorUserId,
      action: "client.invite",
      entityType: "ClientInvitation",
      entityId: invite.id,
      metadata: { email: input.email, role: input.portalRole },
    });
    return { invite, token };
  },

  async createHireRequest(input: {
    clientOrganizationId: string;
    actorUserId: string;
    candidate: Record<string, unknown>;
    provisionalCost?: Record<string, unknown>;
  }) {
    const req = await prisma.hireRequest.create({
      data: {
        clientOrganizationId: input.clientOrganizationId,
        status: "SUBMITTED",
        candidateJson: input.candidate as Prisma.InputJsonValue,
        provisionalCostJson: input.provisionalCost as Prisma.InputJsonValue | undefined,
        submittedAt: new Date(),
      },
    });
    await writeClientActivity({
      clientOrganizationId: input.clientOrganizationId,
      actorUserId: input.actorUserId,
      action: "hire.submit",
      entityType: "HireRequest",
      entityId: req.id,
    });
    return req;
  },

  async assignEmployee(input: {
    actorUserId: string;
    clientId: string;
    employeeId: string;
    novaCompanyId: string;
    effectiveFrom: Date;
  }) {
    const employee = await prisma.employee.findUniqueOrThrow({ where: { id: input.employeeId } });
    if (employee.companyId !== input.novaCompanyId) {
      throw new Error("Employee NOVA employer must match assignment novaCompanyId");
    }
    return prisma.employmentAssignment.create({
      data: {
        employeeId: input.employeeId,
        clientOrganizationId: input.clientId,
        novaCompanyId: input.novaCompanyId,
        status: "ACTIVE",
        effectiveFrom: input.effectiveFrom,
      },
    });
  },
};

function defaultOnboardingSteps() {
  return [
    { id: "profile", label: "Corporate profile", complete: false },
    { id: "kyb", label: "KYB documents", complete: false },
    { id: "pricing", label: "Commercial schedule", complete: false },
    { id: "msa", label: "Master services agreement", complete: false },
    { id: "dpa", label: "Data processing agreement", complete: false },
    { id: "funding", label: "Funding policy", complete: false },
    { id: "users", label: "Invite administrators", complete: false },
  ];
}

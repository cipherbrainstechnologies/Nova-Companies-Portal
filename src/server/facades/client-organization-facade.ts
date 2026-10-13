import { createHash, randomBytes } from "node:crypto";
import type { ClientOrganizationStatus, ClientPortalRole, Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { writeAudit } from "@/server/audit";
import { hashToken } from "@/server/auth/crypto";
import { slugifyClientName, withUniqueSuffix } from "@/server/client/slug";
import { canActivateClient } from "@/server/client/activation";
import { writeClientActivity } from "@/server/client/client-audit";
import { generateClientDocumentPack, markDraftsOutdated } from "@/server/client/legal-document-service";
import type { OnboardingProfile } from "@/server/client/legal-documents";
import { sendEmail } from "@/server/email";

export const clientOrganizationFacade = {
  async listClients() {
    return prisma.clientOrganization.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        proposedNovaCompany: { select: { id: true, name: true, prefix: true } },
        memberships: { where: { status: "ACTIVE" }, select: { id: true } },
        employmentAssignments: { where: { status: "ACTIVE" }, select: { id: true } },
        pricingAgreements: {
          orderBy: { version: "desc" },
          select: { version: true, currency: true, feePerEmployee: true, effectiveFrom: true, effectiveTo: true },
        },
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
        legalDocuments: { orderBy: { generatedAt: "desc" }, include: { template: { select: { status: true, name: true } } } },
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

  async onboardClient(input: {
    actorUserId: string;
    legalName: string;
    tradeName?: string;
    countryCode: string;
    registrationNumber?: string;
    taxId?: string;
    website?: string;
    billingCurrency?: string;
    intendedEmployeeCount?: number;
    proposedNovaCompanyId?: string;
    profile: OnboardingProfile;
  }) {
    const countryCode = input.countryCode.toUpperCase();
    const existing = await prisma.clientOrganization.findFirst({
      where: {
        legalName: { equals: input.legalName.trim(), mode: "insensitive" },
        countryCode,
      },
    });
    if (existing) {
      const documents = await generateClientDocumentPack({
        actorUserId: input.actorUserId,
        clientId: existing.id,
      });
      return { client: existing, created: false, documents };
    }

    const baseSlug = slugifyClientName(input.legalName);
    const slug = withUniqueSuffix(baseSlug, randomBytes(3).toString("hex"));
    const publicReference = `NW-${countryCode}-${randomBytes(3).toString("hex").toUpperCase()}`;
    const client = await prisma.clientOrganization.create({
      data: {
        slug,
        publicReference,
        legalName: input.legalName.trim(),
        tradeName: input.tradeName?.trim() || null,
        countryCode,
        registrationNumber: input.registrationNumber?.trim() || null,
        taxId: input.taxId?.trim() || null,
        website: input.website?.trim() || null,
        billingCurrency: input.billingCurrency ?? "GBP",
        intendedEmployeeCount: input.intendedEmployeeCount,
        proposedNovaCompanyId: input.proposedNovaCompanyId || null,
        billingAddressJson: { profile: input.profile },
        lifecycleStatus: "DRAFT",
        onboardingCases: {
          create: {
            status: "DRAFT",
            checklistJson: {
              steps: defaultOnboardingSteps(),
              proposedPlanId: input.profile.planId ?? null,
              proposedPlanSavedAt: new Date().toISOString(),
            },
          },
        },
      },
    });
    await writeAudit({
      actorUserId: input.actorUserId,
      action: "client.create",
      entityType: "ClientOrganization",
      entityId: client.id,
      metadata: { slug: client.slug, publicReference },
    });
    const documents = await generateClientDocumentPack({
      actorUserId: input.actorUserId,
      clientId: client.id,
    });
    return { client, created: true, documents };
  },

  async updateOnboardingProfile(input: {
    actorUserId: string;
    clientId: string;
    legalName?: string;
    tradeName?: string;
    registrationNumber?: string;
    taxId?: string;
    website?: string;
    billingCurrency?: string;
    intendedEmployeeCount?: number;
    proposedNovaCompanyId?: string;
    profile: OnboardingProfile;
  }) {
    const current = await prisma.clientOrganization.findUnique({ where: { id: input.clientId } });
    if (!current) throw new Error("Client not found");
    if (current.lifecycleStatus === "ACTIVE" || current.lifecycleStatus === "CLOSED") {
      throw new Error("Active client details are changed by amendment, not by regenerating drafts");
    }
    const client = await prisma.clientOrganization.update({
      where: { id: input.clientId },
      data: {
        legalName: input.legalName?.trim() || current.legalName,
        tradeName: input.tradeName?.trim() || current.tradeName,
        registrationNumber: input.registrationNumber?.trim() || current.registrationNumber,
        taxId: input.taxId?.trim() || current.taxId,
        website: input.website?.trim() || current.website,
        billingCurrency: input.billingCurrency || current.billingCurrency,
        intendedEmployeeCount: input.intendedEmployeeCount ?? current.intendedEmployeeCount,
        proposedNovaCompanyId: input.proposedNovaCompanyId || current.proposedNovaCompanyId,
        billingAddressJson: { profile: input.profile },
      },
    });
    await markDraftsOutdated(client.id);
    const documents = await generateClientDocumentPack({
      actorUserId: input.actorUserId,
      clientId: client.id,
      regenerate: true,
    });
    return { client, documents };
  },

  async updateLifecycle(input: {
    actorUserId: string;
    clientId: string;
    status: ClientOrganizationStatus;
    reason?: string;
  }) {
    if (input.status === "ACTIVE") {
      const current = await prisma.clientOrganization.findUnique({ where: { id: input.clientId } });
      const { ok, blockers } = await canActivateClient(input.clientId);
      if (!ok) {
        throw new Error(`Activation blocked: ${blockers.map((b) => b.code).join(", ")}`);
      }
      if (current?.lifecycleStatus === "ACTIVE") return current;
    }

    const updated = await prisma.clientOrganization.update({
      where: { id: input.clientId },
      data: { lifecycleStatus: input.status },
    });

    if (input.status === "ACTIVE") {
      await issueActivationInvite(input.actorUserId, updated.id);
    }

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
    const client = await prisma.clientOrganization.findUnique({ where: { id: input.clientId } });
    if (!client || client.lifecycleStatus !== "ACTIVE") {
      throw new Error("Invitations are issued after the client is activated");
    }
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

async function issueActivationInvite(actorUserId: string, clientId: string) {
  const client = await prisma.clientOrganization.findUnique({ where: { id: clientId } });
  if (!client || client.lifecycleStatus !== "ACTIVE") return;
  const profile =
    client.billingAddressJson &&
    typeof client.billingAddressJson === "object" &&
    !Array.isArray(client.billingAddressJson)
      ? (client.billingAddressJson as { profile?: { representativeEmail?: string } }).profile
      : undefined;
  const email = profile?.representativeEmail?.trim().toLowerCase();
  if (!email) return;
  const openInvite = await prisma.clientInvitation.findFirst({
    where: {
      clientOrganizationId: clientId,
      email,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  if (openInvite) return;
  const token = randomBytes(32).toString("hex");
  const invite = await prisma.clientInvitation.create({
    data: {
      clientOrganizationId: clientId,
      email,
      portalRole: "OWNER_ADMIN",
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      invitedByUserId: actorUserId,
    },
  });
  const base = (process.env.APP_URL ?? "https://www.novaworkforce.in").replace(/\/$/, "");
  await sendEmail({
    to: email,
    subject: "Your Nova Workforce client portal invitation",
    text: `Nova has activated ${client.legalName}. Open this link to choose your own password: ${base}/client/accept-invite?token=${token}`,
  });
  await writeClientActivity({
    clientOrganizationId: clientId,
    actorUserId,
    action: "client.activation_invite",
    entityType: "ClientInvitation",
    entityId: invite.id,
    metadata: { email },
  });
}

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

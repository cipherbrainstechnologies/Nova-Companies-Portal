import { createHash } from "node:crypto";
import type { ClientOrganizationStatus, Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { storePrivateFile } from "@/server/storage/s3";
import { writeClientActivity } from "@/server/client/client-audit";

export class OnboardingInputError extends Error {}

const MAX_KYB_BYTES = 15 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export async function uploadKybDocument(input: {
  clientOrganizationId: string;
  actorUserId: string;
  category: string;
  buffer: Buffer;
  mimeType: string;
  originalName: string;
}) {
  if (!ALLOWED_MIME.has(input.mimeType)) {
    throw new Error("File type not allowed");
  }
  if (input.buffer.length > MAX_KYB_BYTES) {
    throw new Error("File too large");
  }

  const caseRow = await prisma.clientOnboardingCase.findFirst({
    where: { clientOrganizationId: input.clientOrganizationId },
    orderBy: { createdAt: "desc" },
  });
  if (!caseRow) throw new Error("Onboarding case missing");

  const stored = await storePrivateFile({
    buffer: input.buffer,
    mimeType: input.mimeType,
    originalName: input.originalName,
    prefix: `clients/${input.clientOrganizationId}/kyb`,
  });

  const doc = await prisma.clientKYBDocument.create({
    data: {
      onboardingCaseId: caseRow.id,
      category: input.category,
      fileKey: stored.storageKey,
      contentSha256: stored.checksumSha256,
      status: "UPLOADED",
    },
  });

  await prisma.clientOrganization.update({
    where: { id: input.clientOrganizationId },
    data: { lifecycleStatus: "KYB_IN_PROGRESS" },
  });

  await writeClientActivity({
    clientOrganizationId: input.clientOrganizationId,
    actorUserId: input.actorUserId,
    action: "kyb.upload",
    entityType: "ClientKYBDocument",
    entityId: doc.id,
    metadata: { category: input.category, sha256: stored.checksumSha256 },
  });

  return doc;
}

export async function transitionOnboardingStatus(
  clientOrganizationId: string,
  status: ClientOrganizationStatus,
) {
  await prisma.clientOrganization.update({
    where: { id: clientOrganizationId },
    data: { lifecycleStatus: status },
  });
  const caseRow = await prisma.clientOnboardingCase.findFirst({
    where: { clientOrganizationId },
    orderBy: { createdAt: "desc" },
  });
  if (caseRow) {
    await prisma.clientOnboardingCase.update({
      where: { id: caseRow.id },
      data: { status },
    });
  }
}

const SUBMITTABLE_ONBOARDING = new Set<ClientOrganizationStatus>([
  "DRAFT",
  "INVITED",
  "KYB_IN_PROGRESS",
  "CHANGES_REQUESTED",
]);

const ALREADY_SUBMITTED_ONBOARDING = new Set<ClientOrganizationStatus>([
  "KYB_REVIEW",
  "CONTRACT_PENDING",
  "SIGNATURE_PENDING",
  "COMPLIANCE_REVIEW",
]);

export function classifyOnboardingSubmit(
  status: ClientOrganizationStatus,
): "submit" | "already" | "blocked" {
  if (SUBMITTABLE_ONBOARDING.has(status)) return "submit";
  if (ALREADY_SUBMITTED_ONBOARDING.has(status)) return "already";
  return "blocked";
}

export async function submitClientOnboarding(input: {
  clientOrganizationId: string;
  actorUserId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const client = await tx.clientOrganization.findUniqueOrThrow({
      where: { id: input.clientOrganizationId },
    });
    const kind = classifyOnboardingSubmit(client.lifecycleStatus);
    if (kind === "blocked") {
      throw new OnboardingInputError("Onboarding cannot be submitted from the current status");
    }
    if (kind === "already") {
      return { status: client.lifecycleStatus, alreadySubmitted: true as const };
    }

    const caseRow = await tx.clientOnboardingCase.findFirst({
      where: { clientOrganizationId: input.clientOrganizationId },
      orderBy: { createdAt: "desc" },
      include: { kybDocuments: { select: { id: true } } },
    });
    if (!caseRow || caseRow.kybDocuments.length === 0) {
      throw new OnboardingInputError("Upload at least one verification document before submitting");
    }

    const previous = client.lifecycleStatus;
    await tx.clientOrganization.update({
      where: { id: client.id },
      data: { lifecycleStatus: "KYB_REVIEW" },
    });
    await tx.clientOnboardingCase.update({
      where: { id: caseRow.id },
      data: { status: "KYB_REVIEW", submittedAt: caseRow.submittedAt ?? new Date() },
    });
    await tx.clientActivityAudit.create({
      data: {
        clientOrganizationId: client.id,
        actorUserId: input.actorUserId,
        action: "onboarding.submit",
        entityType: "ClientOrganization",
        entityId: client.id,
        metadataJson: { previous, next: "KYB_REVIEW" },
      },
    });
    return { status: "KYB_REVIEW" as const, alreadySubmitted: false as const };
  });
}

function jsonRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return { ...(value as Record<string, unknown>) };
  }
  return {};
}

export async function saveOnboardingProfile(input: {
  clientOrganizationId: string;
  actorUserId: string;
  legalName: string;
  tradeName?: string;
  countryCode: string;
  registrationNumber?: string;
  website?: string;
  intendedEmployeeCount?: number;
  profile: Record<string, string | undefined>;
}) {
  const client = await prisma.clientOrganization.findUniqueOrThrow({
    where: { id: input.clientOrganizationId },
  });
  if (client.lifecycleStatus === "ACTIVE" || client.lifecycleStatus === "CLOSED") {
    throw new OnboardingInputError("Company profile is locked for this status");
  }
  const address = jsonRecord(client.billingAddressJson);
  for (const [key, value] of Object.entries(input.profile)) {
    if (value) address[key] = value;
  }
  await prisma.clientOrganization.update({
    where: { id: client.id },
    data: {
      legalName: input.legalName,
      tradeName: input.tradeName || null,
      countryCode: input.countryCode.toUpperCase(),
      registrationNumber: input.registrationNumber || null,
      website: input.website || null,
      intendedEmployeeCount: input.intendedEmployeeCount ?? null,
      billingAddressJson: address as Prisma.InputJsonValue,
    },
  });
  await writeClientActivity({
    clientOrganizationId: client.id,
    actorUserId: input.actorUserId,
    action: "onboarding.profile",
    entityType: "ClientOrganization",
    entityId: client.id,
  });
}

export async function saveProposedPlan(input: {
  clientOrganizationId: string;
  actorUserId: string;
  planId: "essential" | "managed" | "enterprise";
}) {
  const caseRow = await prisma.clientOnboardingCase.findFirst({
    where: { clientOrganizationId: input.clientOrganizationId },
    orderBy: { createdAt: "desc" },
  });
  if (!caseRow) throw new Error("Onboarding case missing");
  const checklist = jsonRecord(caseRow.checklistJson);
  checklist.proposedPlanId = input.planId;
  checklist.proposedPlanSavedAt = new Date().toISOString();
  await prisma.clientOnboardingCase.update({
    where: { id: caseRow.id },
    data: { checklistJson: checklist as Prisma.InputJsonValue },
  });
  await writeClientActivity({
    clientOrganizationId: input.clientOrganizationId,
    actorUserId: input.actorUserId,
    action: "onboarding.plan",
    entityType: "ClientOnboardingCase",
    entityId: caseRow.id,
    metadata: { planId: input.planId },
  });
  return { planId: input.planId };
}

export function simpleMalwareHeuristic(buffer: Buffer): boolean {
  const head = buffer.subarray(0, 64).toString("utf8");
  if (head.includes("EICAR")) return true;
  const sha = createHash("sha256").update(buffer).digest("hex");
  return sha === "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
}

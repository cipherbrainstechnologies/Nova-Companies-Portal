import { createHash } from "node:crypto";
import type { ClientOrganizationStatus } from "@prisma/client";
import { prisma } from "@/server/db";
import { storePrivateFile } from "@/server/storage/s3";
import { writeClientActivity } from "@/server/client/client-audit";

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

export function simpleMalwareHeuristic(buffer: Buffer): boolean {
  const head = buffer.subarray(0, 64).toString("utf8");
  if (head.includes("EICAR")) return true;
  const sha = createHash("sha256").update(buffer).digest("hex");
  return sha === "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
}

import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { writeAudit } from "@/server/audit";
import { writeClientActivity } from "@/server/client/client-audit";
import { storePrivateFile } from "@/server/storage/s3";
import { generatePayslipPdf } from "@/server/payroll/pdf-generator";
import {
  LEGAL_REVIEW_FLAGS,
  LEGAL_TEMPLATE_SEEDS,
  canRegenerateDraft,
  executionBlockers,
  missingRequired,
  packCodes,
  renderTemplateBody,
  resolveVariables,
  withCurrency,
  type OnboardingProfile,
} from "@/server/client/legal-documents";

const OPEN_STATUSES = [
  "AWAITING_INFORMATION",
  "DRAFT",
  "GENERATION_FAILED",
  "INTERNAL_REVIEW",
  "APPROVED_FOR_SIGNATURE",
  "NOT_APPLICABLE",
] as const;

export function readProfile(value: Prisma.JsonValue | null | undefined): OnboardingProfile {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const record = value as Record<string, Prisma.JsonValue>;
  const profile = record.profile;
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) return {};
  return profile as OnboardingProfile;
}

export async function ensureLegalTemplateLibrary() {
  for (const seed of LEGAL_TEMPLATE_SEEDS) {
    const existing = await prisma.legalTemplate.findFirst({
      where: { code: seed.code },
      orderBy: { version: "desc" },
    });
    if (existing) continue;
    await prisma.legalTemplate.create({
      data: {
        code: seed.code,
        name: seed.name,
        version: 1,
        status: "DRAFT",
        bodyMarkdown: seed.bodyMarkdown,
        requiredVariables: seed.requiredVariables,
        legalFlags: [...LEGAL_REVIEW_FLAGS],
        conditional: seed.conditional,
      },
    });
  }
}

function markdownToHtml(markdown: string) {
  const escaped = markdown
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const body = escaped
    .split("\n")
    .map((line) => (line.startsWith("# ") ? `<h1>${line.slice(2)}</h1>` : `<p>${line || "&nbsp;"}</p>`))
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:sans-serif;font-size:12px;color:#171727}h1{font-size:18px}</style></head><body>${body}</body></html>`;
}

async function latestApprovedOrDraft(code: string) {
  const approved = await prisma.legalTemplate.findFirst({
    where: { code, status: "APPROVED" },
    orderBy: { version: "desc" },
  });
  if (approved) return approved;
  return prisma.legalTemplate.findFirst({
    where: { code, status: "DRAFT" },
    orderBy: { version: "desc" },
  });
}

export async function generateClientDocumentPack(input: {
  actorUserId: string;
  clientId: string;
  codes?: string[];
  regenerate?: boolean;
}) {
  await ensureLegalTemplateLibrary();
  const client = await prisma.clientOrganization.findUnique({
    where: { id: input.clientId },
    include: { proposedNovaCompany: true },
  });
  if (!client) throw new Error("Client not found");
  const profile = readProfile(client.billingAddressJson);
  const codes = input.codes ?? packCodes(profile);
  const results = [];

  for (const code of codes) {
    const template = await latestApprovedOrDraft(code);
    if (!template) {
      results.push({ code, status: "GENERATION_FAILED", reason: "template_missing" });
      continue;
    }
    const current = await prisma.clientLegalDocument.findFirst({
      where: {
        clientOrganizationId: client.id,
        templateCode: code,
        status: { notIn: ["OUTDATED", "SUPERSEDED", "VOIDED"] },
      },
      orderBy: { generatedAt: "desc" },
    });
    if (current && !input.regenerate && current.status !== "GENERATION_FAILED") {
      results.push(current);
      continue;
    }
    if (current && !canRegenerateDraft(current.status)) {
      results.push(current);
      continue;
    }
    if (current && input.regenerate) {
      await prisma.clientLegalDocument.update({
        where: { id: current.id },
        data: { status: "OUTDATED" },
      });
    }

    if (code === "DPA" && profile.dataProcessing === "not_required") {
      const row = await prisma.clientLegalDocument.create({
        data: {
          clientOrganizationId: client.id,
          templateId: template.id,
          templateCode: code,
          templateVersion: template.version,
          status: "NOT_APPLICABLE",
          assessmentNote: "Data processing assessed as not required for this client.",
          variableSnapshot: {},
        },
      });
      results.push(row);
      continue;
    }

    const required = Array.isArray(template.requiredVariables)
      ? (template.requiredVariables as string[])
      : [];
    const vars = withCurrency(
      resolveVariables({
        legalName: client.legalName,
        registrationNumber: client.registrationNumber,
        countryCode: client.countryCode,
        profile,
        novaName: client.proposedNovaCompany?.name,
        novaAddress: client.proposedNovaCompany?.address,
        templateVersion: template.version,
      }),
      client.billingCurrency,
    );
    const missing = missingRequired(required, vars);
    const rendered = renderTemplateBody(template.bodyMarkdown, vars);
    try {
      const pdf = await generatePayslipPdf(markdownToHtml(rendered));
      const stored = await storePrivateFile({
        buffer: pdf.buffer,
        mimeType: "application/pdf",
        originalName: `${code}-v${template.version}.pdf`,
        prefix: `clients/${client.id}/legal`,
        dedupeByChecksum: false,
      });
      const row = await prisma.clientLegalDocument.create({
        data: {
          clientOrganizationId: client.id,
          templateId: template.id,
          templateCode: code,
          templateVersion: template.version,
          status: missing.length ? "AWAITING_INFORMATION" : "DRAFT",
          storageKey: stored.storageKey,
          sha256: pdf.sha256,
          missingVariables: missing,
          variableSnapshot: vars,
        },
      });
      results.push(row);
    } catch (error) {
      const row = await prisma.clientLegalDocument.create({
        data: {
          clientOrganizationId: client.id,
          templateId: template.id,
          templateCode: code,
          templateVersion: template.version,
          status: "GENERATION_FAILED",
          missingVariables: missing,
          variableSnapshot: vars,
          assessmentNote: error instanceof Error ? error.message : "generation_failed",
        },
      });
      results.push(row);
    }
  }

  await writeClientActivity({
    clientOrganizationId: client.id,
    actorUserId: input.actorUserId,
    action: input.regenerate ? "legal.regenerate" : "legal.generate",
    entityType: "ClientOrganization",
    entityId: client.id,
    metadata: { codes },
  });
  return results;
}

export async function markDraftsOutdated(clientId: string) {
  await prisma.clientLegalDocument.updateMany({
    where: {
      clientOrganizationId: clientId,
      status: { in: [...OPEN_STATUSES] },
    },
    data: { status: "OUTDATED" },
  });
}

export async function transitionLegalDocument(input: {
  actorUserId: string;
  clientId: string;
  documentId: string;
  action: "review" | "approve_signature" | "send" | "execute" | "decline" | "void";
  signatoryName?: string;
  signatoryEmail?: string;
  signedAt?: string;
  executedFile?: { buffer: Buffer; mimeType: string; originalName: string };
}) {
  const doc = await prisma.clientLegalDocument.findFirst({
    where: { id: input.documentId, clientOrganizationId: input.clientId },
    include: { template: true, clientOrganization: { include: { proposedNovaCompany: true } } },
  });
  if (!doc) throw new Error("Document not found");
  if (doc.status === "FULLY_EXECUTED" && input.action !== "void") {
    throw new Error("An executed agreement cannot be changed. Use an amendment.");
  }

  if (input.action === "review") {
    if (!["DRAFT", "AWAITING_INFORMATION"].includes(doc.status)) throw new Error("Document is not a draft");
    return prisma.clientLegalDocument.update({
      where: { id: doc.id },
      data: { status: "INTERNAL_REVIEW" },
    });
  }

  if (input.action === "approve_signature") {
    const missing = Array.isArray(doc.missingVariables) ? (doc.missingVariables as string[]) : [];
    if (doc.template.status !== "APPROVED") throw new Error("Template version is not approved for execution");
    if (missing.length) throw new Error("Document is awaiting information");
    if (doc.status !== "INTERNAL_REVIEW") throw new Error("Internal review is required first");
    return prisma.clientLegalDocument.update({
      where: { id: doc.id },
      data: { status: "APPROVED_FOR_SIGNATURE" },
    });
  }

  if (input.action === "send") {
    if (doc.status !== "APPROVED_FOR_SIGNATURE") throw new Error("Document is not approved for signature");
    return prisma.clientLegalDocument.update({
      where: { id: doc.id },
      data: { status: "SENT_FOR_SIGNATURE" },
    });
  }

  if (input.action === "decline") {
    return prisma.clientLegalDocument.update({ where: { id: doc.id }, data: { status: "DECLINED" } });
  }

  if (input.action === "void") {
    if (doc.status === "FULLY_EXECUTED") throw new Error("An executed agreement cannot be voided in place");
    return prisma.clientLegalDocument.update({ where: { id: doc.id }, data: { status: "VOIDED" } });
  }

  const missing = Array.isArray(doc.missingVariables) ? (doc.missingVariables as string[]) : [];
  const blockers = executionBlockers({
    status: doc.status,
    templateStatus: doc.template.status,
    missing,
  });
  if (blockers.length) throw new Error(`Execution blocked: ${blockers.join(", ")}`);
  if (!input.signatoryName || !input.signatoryEmail || !input.signedAt || !input.executedFile) {
    throw new Error("A verified signed copy, signatory, and signature time are required");
  }
  const stored = await storePrivateFile({
    buffer: input.executedFile.buffer,
    mimeType: input.executedFile.mimeType,
    originalName: input.executedFile.originalName,
    prefix: `clients/${doc.clientOrganizationId}/executed`,
    dedupeByChecksum: false,
  });
  const updated = await prisma.clientLegalDocument.update({
    where: { id: doc.id },
    data: {
      status: "FULLY_EXECUTED",
      executedStorageKey: stored.storageKey,
      executedSha256: stored.checksumSha256,
      signatoryName: input.signatoryName,
      signatoryEmail: input.signatoryEmail.toLowerCase(),
      signedAt: new Date(input.signedAt),
    },
  });

  if (doc.templateCode === "MSA" && doc.clientOrganization.proposedNovaCompanyId) {
    const existing = await prisma.signatureEnvelope.findFirst({
      where: {
        status: "COMPLETED",
        agreement: {
          clientOrganizationId: doc.clientOrganizationId,
          novaCompanyId: doc.clientOrganization.proposedNovaCompanyId,
          effectiveTo: null,
        },
      },
    });
    if (!existing) {
      const agreement = await prisma.novaEntityClientAgreement.create({
        data: {
          clientOrganizationId: doc.clientOrganizationId,
          novaCompanyId: doc.clientOrganization.proposedNovaCompanyId,
          contractVersion: `${doc.templateCode}-v${doc.templateVersion}`,
          effectiveFrom: updated.signedAt ?? new Date(),
          approvedByUserId: input.actorUserId,
        },
      });
      await prisma.agreementDocument.create({
        data: {
          agreementId: agreement.id,
          docType: doc.templateCode,
          version: String(doc.templateVersion),
          pdfSha256: stored.checksumSha256,
          storageKey: stored.storageKey,
        },
      });
      const envelope = await prisma.signatureEnvelope.create({
        data: {
          agreementId: agreement.id,
          provider: "manual",
          status: "COMPLETED",
          documentSha256: stored.checksumSha256,
          completedAt: updated.signedAt ?? new Date(),
        },
      });
      await prisma.signatureEvent.create({
        data: {
          envelopeId: envelope.id,
          signerName: input.signatoryName,
          signerEmail: input.signatoryEmail.toLowerCase(),
          signedAt: updated.signedAt ?? new Date(),
          evidenceJson: { documentId: doc.id, sha256: stored.checksumSha256 },
        },
      });
    }
  }

  await writeAudit({
    actorUserId: input.actorUserId,
    action: "legal.executed",
    entityType: "ClientLegalDocument",
    entityId: doc.id,
    metadata: { sha256: stored.checksumSha256 },
  });
  return updated;
}

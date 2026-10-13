-- AlterTable
ALTER TABLE "ClientOrganization" ADD COLUMN "publicReference" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ClientOrganization_publicReference_key" ON "ClientOrganization"("publicReference");

-- CreateEnum
CREATE TYPE "LegalTemplateStatus" AS ENUM ('DRAFT', 'APPROVED', 'RETIRED');

-- CreateEnum
CREATE TYPE "ClientLegalDocumentStatus" AS ENUM ('AWAITING_INFORMATION', 'DRAFT', 'GENERATION_FAILED', 'NOT_APPLICABLE', 'OUTDATED', 'INTERNAL_REVIEW', 'APPROVED_FOR_SIGNATURE', 'SENT_FOR_SIGNATURE', 'PARTIALLY_SIGNED', 'FULLY_EXECUTED', 'DECLINED', 'EXPIRED', 'VOIDED', 'SUPERSEDED');

-- CreateTable
CREATE TABLE "LegalTemplate" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "LegalTemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "bodyMarkdown" TEXT NOT NULL,
    "requiredVariables" JSONB NOT NULL,
    "legalFlags" JSONB NOT NULL,
    "conditional" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedByUserId" TEXT,
    "retiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientLegalDocument" (
    "id" TEXT NOT NULL,
    "clientOrganizationId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "templateCode" TEXT NOT NULL,
    "templateVersion" INTEGER NOT NULL,
    "status" "ClientLegalDocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "storageKey" TEXT,
    "sha256" TEXT,
    "executedStorageKey" TEXT,
    "executedSha256" TEXT,
    "missingVariables" JSONB,
    "variableSnapshot" JSONB,
    "assessmentNote" TEXT,
    "signatoryName" TEXT,
    "signatoryEmail" TEXT,
    "signedAt" TIMESTAMP(3),
    "providerEnvelopeId" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientLegalDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LegalTemplate_code_version_key" ON "LegalTemplate"("code", "version");

-- CreateIndex
CREATE INDEX "LegalTemplate_code_status_idx" ON "LegalTemplate"("code", "status");

-- CreateIndex
CREATE INDEX "ClientLegalDocument_clientOrganizationId_templateCode_status_idx" ON "ClientLegalDocument"("clientOrganizationId", "templateCode", "status");

-- AddForeignKey
ALTER TABLE "ClientLegalDocument" ADD CONSTRAINT "ClientLegalDocument_clientOrganizationId_fkey" FOREIGN KEY ("clientOrganizationId") REFERENCES "ClientOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientLegalDocument" ADD CONSTRAINT "ClientLegalDocument_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "LegalTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

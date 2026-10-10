-- CreateEnum
CREATE TYPE "ClientOrganizationStatus" AS ENUM ('DRAFT', 'INVITED', 'KYB_IN_PROGRESS', 'KYB_REVIEW', 'CONTRACT_PENDING', 'SIGNATURE_PENDING', 'COMPLIANCE_REVIEW', 'ACTIVE', 'CHANGES_REQUESTED', 'REJECTED', 'SUSPENDED', 'OFFBOARDING', 'CLOSED');

-- CreateEnum
CREATE TYPE "ClientMembershipStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ClientPortalRole" AS ENUM ('OWNER_ADMIN', 'HR_MANAGER', 'FINANCE', 'TEAM_MANAGER', 'READ_ONLY_AUDITOR');

-- CreateEnum
CREATE TYPE "ClientCapabilityModule" AS ENUM ('overview', 'onboarding', 'team', 'payroll', 'costs', 'invoices', 'documents', 'approvals', 'people', 'settings', 'support', 'activity', 'leaveExpenses');

-- CreateEnum
CREATE TYPE "ClientCapabilityAction" AS ENUM ('VIEW', 'CREATE', 'EDIT', 'SUBMIT', 'APPROVE', 'DOWNLOAD', 'INVITE', 'MANAGE', 'EXECUTE');

-- CreateEnum
CREATE TYPE "HireRequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'NOVA_REVIEW', 'OFFER_PENDING', 'EMPLOYEE_INVITED', 'DOCUMENTS_PENDING', 'VERIFICATION', 'CONTRACT_SIGNATURE', 'STATUTORY_SETUP', 'READY_TO_JOIN', 'ACTIVE', 'MORE_INFO', 'REJECTED', 'WITHDRAWN', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "EmploymentAssignmentStatus" AS ENUM ('PENDING', 'ACTIVE', 'ON_HOLD', 'ENDED');

-- CreateEnum
CREATE TYPE "VerificationCheckStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'PASSED', 'FAILED', 'WAIVED');

-- CreateEnum
CREATE TYPE "ClientInvoiceFinancialState" AS ENUM ('FORECAST', 'CLIENT_APPROVED', 'INVOICE_DRAFT', 'FINANCE_APPROVED', 'ISSUED', 'PART_PAID', 'PAID', 'RECONCILED', 'OVERDUE', 'DISPUTED', 'VOIDED', 'CREDITED');

-- CreateEnum
CREATE TYPE "SignatureEnvelopeStatus" AS ENUM ('DRAFT', 'SENT', 'PARTIALLY_SIGNED', 'COMPLETED', 'DECLINED', 'VOIDED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ClientApprovalTaskType" AS ENUM ('HIRE', 'SALARY_CHANGE', 'LEAVE', 'EXPENSE', 'FUNDING', 'PAYROLL_INPUT', 'KYB', 'CONTRACT');

-- CreateEnum
CREATE TYPE "ClientApprovalTaskStatus" AS ENUM ('OPEN', 'APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED');

-- AlterEnum
ALTER TYPE "GlobalRole" ADD VALUE 'CLIENT_USER';

-- AlterEnum
ALTER TYPE "AppModule" ADD VALUE 'clients';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AppAction" ADD VALUE 'submit';
ALTER TYPE "AppAction" ADD VALUE 'invite';
ALTER TYPE "AppAction" ADD VALUE 'execute';

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "activeClientOrganizationId" TEXT;

-- CreateTable
CREATE TABLE "ClientOrganization" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "tradeName" TEXT,
    "countryCode" TEXT NOT NULL,
    "registrationNumber" TEXT,
    "taxId" TEXT,
    "website" TEXT,
    "billingAddressJson" JSONB,
    "lifecycleStatus" "ClientOrganizationStatus" NOT NULL DEFAULT 'DRAFT',
    "intendedEmployeeCount" INTEGER,
    "billingCurrency" TEXT NOT NULL DEFAULT 'GBP',
    "relationshipOwnerId" TEXT,
    "proposedNovaCompanyId" TEXT,
    "riskRating" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientOrganization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientLegalEntity" (
    "id" TEXT NOT NULL,
    "clientOrganizationId" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "registrationNumber" TEXT,
    "taxId" TEXT,
    "billingAddressJson" JSONB,
    "isPrimaryBillTo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientLegalEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientOrganizationId" TEXT NOT NULL,
    "status" "ClientMembershipStatus" NOT NULL DEFAULT 'INVITED',
    "portalRole" "ClientPortalRole" NOT NULL DEFAULT 'OWNER_ADMIN',
    "invitedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "mfaEnrolledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientPermissionOverride" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "module" "ClientCapabilityModule" NOT NULL,
    "action" "ClientCapabilityAction" NOT NULL,
    "allowed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientPermissionOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientEmployeeScope" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientEmployeeScope_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientInvitation" (
    "id" TEXT NOT NULL,
    "clientOrganizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "portalRole" "ClientPortalRole" NOT NULL DEFAULT 'HR_MANAGER',
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "invitedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientOnboardingCase" (
    "id" TEXT NOT NULL,
    "clientOrganizationId" TEXT NOT NULL,
    "status" "ClientOrganizationStatus" NOT NULL,
    "checklistJson" JSONB,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewerNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientOnboardingCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientKYBDocument" (
    "id" TEXT NOT NULL,
    "onboardingCaseId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "contentSha256" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'UPLOADED',
    "reviewerUserId" TEXT,
    "rejectionReason" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientKYBDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientComplianceReview" (
    "id" TEXT NOT NULL,
    "onboardingCaseId" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "riskRating" TEXT,
    "notes" TEXT,
    "reviewerUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientComplianceReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NovaEntityClientAgreement" (
    "id" TEXT NOT NULL,
    "clientOrganizationId" TEXT NOT NULL,
    "novaCompanyId" TEXT NOT NULL,
    "contractVersion" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "approvedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NovaEntityClientAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgreementDocument" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "pdfSha256" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgreementDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignatureEnvelope" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'manual',
    "providerEnvelopeId" TEXT,
    "status" "SignatureEnvelopeStatus" NOT NULL DEFAULT 'DRAFT',
    "documentSha256" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SignatureEnvelope_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignatureEvent" (
    "id" TEXT NOT NULL,
    "envelopeId" TEXT NOT NULL,
    "signerName" TEXT NOT NULL,
    "signerEmail" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL,
    "evidenceJson" JSONB,

    CONSTRAINT "SignatureEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmploymentAssignment" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "clientOrganizationId" TEXT NOT NULL,
    "novaCompanyId" TEXT NOT NULL,
    "status" "EmploymentAssignmentStatus" NOT NULL DEFAULT 'PENDING',
    "managerMembershipId" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "contractReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmploymentAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HireRequest" (
    "id" TEXT NOT NULL,
    "clientOrganizationId" TEXT NOT NULL,
    "status" "HireRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "candidateJson" JSONB NOT NULL,
    "provisionalCostJson" JSONB,
    "submittedAt" TIMESTAMP(3),
    "employeeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HireRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeVerificationCheck" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "checkType" TEXT NOT NULL,
    "status" "VerificationCheckStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "reviewerUserId" TEXT,
    "notes" TEXT,
    "evidenceKey" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeVerificationCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeChangeRequest" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "clientOrganizationId" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientPricingAgreement" (
    "id" TEXT NOT NULL,
    "clientOrganizationId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "feePerEmployee" DECIMAL(18,2) NOT NULL,
    "setupFee" DECIMAL(18,2),
    "termsJson" JSONB,
    "approvedByUserId" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientPricingAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeFeeSchedule" (
    "id" TEXT NOT NULL,
    "pricingAgreementId" TEXT NOT NULL,
    "employeeId" TEXT,
    "flatFeeAmount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeFeeSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployerCostSnapshot" (
    "id" TEXT NOT NULL,
    "clientOrganizationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "novaCompanyId" TEXT NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "breakdownJson" JSONB NOT NULL,
    "isImmutable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployerCostSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FXQuote" (
    "id" TEXT NOT NULL,
    "clientOrganizationId" TEXT NOT NULL,
    "sourceCurrency" TEXT NOT NULL,
    "targetCurrency" TEXT NOT NULL,
    "referenceRate" DECIMAL(18,8) NOT NULL,
    "spreadBps" INTEGER NOT NULL DEFAULT 0,
    "quotedAt" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "metadataJson" JSONB,

    CONSTRAINT "FXQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FXSettlement" (
    "id" TEXT NOT NULL,
    "clientOrganizationId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "bookedRate" DECIMAL(18,8) NOT NULL,
    "settledAt" TIMESTAMP(3) NOT NULL,
    "inrReceived" DECIMAL(18,2) NOT NULL,
    "varianceAmount" DECIMAL(18,2),
    "evidenceKey" TEXT,

    CONSTRAINT "FXSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientPayrollApproval" (
    "id" TEXT NOT NULL,
    "clientOrganizationId" TEXT NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "estimateJson" JSONB,
    "approvedAt" TIMESTAMP(3),
    "approvedByMembershipId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientPayrollApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollFundingRequest" (
    "id" TEXT NOT NULL,
    "clientOrganizationId" TEXT NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "dueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollFundingRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientInvoice" (
    "id" TEXT NOT NULL,
    "clientOrganizationId" TEXT NOT NULL,
    "novaCompanyId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "financialState" "ClientInvoiceFinancialState" NOT NULL DEFAULT 'INVOICE_DRAFT',
    "subtotal" DECIMAL(18,2) NOT NULL,
    "taxTotal" DECIMAL(18,2) NOT NULL,
    "total" DECIMAL(18,2) NOT NULL,
    "issuedAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "pdfSha256" TEXT,
    "pdfStorageKey" TEXT,
    "snapshotJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientInvoiceLine" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "employeeId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unitAmount" DECIMAL(18,2) NOT NULL,
    "lineTotal" DECIMAL(18,2) NOT NULL,
    "metadataJson" JSONB,

    CONSTRAINT "ClientInvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientPayment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientCreditNote" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientCreditNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientApprovalTask" (
    "id" TEXT NOT NULL,
    "clientOrganizationId" TEXT NOT NULL,
    "taskType" "ClientApprovalTaskType" NOT NULL,
    "status" "ClientApprovalTaskStatus" NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "payloadJson" JSONB,
    "dueAt" TIMESTAMP(3),
    "assigneeMembershipId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decisionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientApprovalTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientActivityAudit" (
    "id" TEXT NOT NULL,
    "clientOrganizationId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientActivityAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyRecord" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "responseJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "eventType" TEXT NOT NULL,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientOrganization_slug_key" ON "ClientOrganization"("slug");

-- CreateIndex
CREATE INDEX "ClientOrganization_lifecycleStatus_idx" ON "ClientOrganization"("lifecycleStatus");

-- CreateIndex
CREATE INDEX "ClientOrganization_legalName_idx" ON "ClientOrganization"("legalName");

-- CreateIndex
CREATE INDEX "ClientLegalEntity_clientOrganizationId_idx" ON "ClientLegalEntity"("clientOrganizationId");

-- CreateIndex
CREATE INDEX "ClientMembership_clientOrganizationId_status_idx" ON "ClientMembership"("clientOrganizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ClientMembership_userId_clientOrganizationId_key" ON "ClientMembership"("userId", "clientOrganizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientPermissionOverride_membershipId_module_action_key" ON "ClientPermissionOverride"("membershipId", "module", "action");

-- CreateIndex
CREATE INDEX "ClientEmployeeScope_employeeId_idx" ON "ClientEmployeeScope"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientEmployeeScope_membershipId_employeeId_key" ON "ClientEmployeeScope"("membershipId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientInvitation_tokenHash_key" ON "ClientInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "ClientInvitation_clientOrganizationId_email_idx" ON "ClientInvitation"("clientOrganizationId", "email");

-- CreateIndex
CREATE INDEX "ClientOnboardingCase_clientOrganizationId_idx" ON "ClientOnboardingCase"("clientOrganizationId");

-- CreateIndex
CREATE INDEX "ClientKYBDocument_onboardingCaseId_idx" ON "ClientKYBDocument"("onboardingCaseId");

-- CreateIndex
CREATE INDEX "NovaEntityClientAgreement_clientOrganizationId_novaCompanyI_idx" ON "NovaEntityClientAgreement"("clientOrganizationId", "novaCompanyId");

-- CreateIndex
CREATE INDEX "EmploymentAssignment_clientOrganizationId_status_idx" ON "EmploymentAssignment"("clientOrganizationId", "status");

-- CreateIndex
CREATE INDEX "EmploymentAssignment_employeeId_idx" ON "EmploymentAssignment"("employeeId");

-- CreateIndex
CREATE INDEX "HireRequest_clientOrganizationId_status_idx" ON "HireRequest"("clientOrganizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeVerificationCheck_employeeId_checkType_key" ON "EmployeeVerificationCheck"("employeeId", "checkType");

-- CreateIndex
CREATE INDEX "EmployeeChangeRequest_clientOrganizationId_idx" ON "EmployeeChangeRequest"("clientOrganizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientPricingAgreement_clientOrganizationId_version_key" ON "ClientPricingAgreement"("clientOrganizationId", "version");

-- CreateIndex
CREATE INDEX "EmployeeFeeSchedule_employeeId_idx" ON "EmployeeFeeSchedule"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployerCostSnapshot_clientOrganizationId_employeeId_period_key" ON "EmployerCostSnapshot"("clientOrganizationId", "employeeId", "periodYear", "periodMonth");

-- CreateIndex
CREATE INDEX "FXQuote_clientOrganizationId_quotedAt_idx" ON "FXQuote"("clientOrganizationId", "quotedAt");

-- CreateIndex
CREATE INDEX "FXSettlement_clientOrganizationId_idx" ON "FXSettlement"("clientOrganizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientPayrollApproval_clientOrganizationId_periodYear_perio_key" ON "ClientPayrollApproval"("clientOrganizationId", "periodYear", "periodMonth");

-- CreateIndex
CREATE INDEX "ClientInvoice_clientOrganizationId_financialState_idx" ON "ClientInvoice"("clientOrganizationId", "financialState");

-- CreateIndex
CREATE UNIQUE INDEX "ClientInvoice_novaCompanyId_invoiceNumber_key" ON "ClientInvoice"("novaCompanyId", "invoiceNumber");

-- CreateIndex
CREATE INDEX "ClientInvoiceLine_invoiceId_idx" ON "ClientInvoiceLine"("invoiceId");

-- CreateIndex
CREATE INDEX "ClientApprovalTask_clientOrganizationId_status_idx" ON "ClientApprovalTask"("clientOrganizationId", "status");

-- CreateIndex
CREATE INDEX "ClientActivityAudit_clientOrganizationId_createdAt_idx" ON "ClientActivityAudit"("clientOrganizationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyRecord_key_key" ON "IdempotencyRecord"("key");

-- CreateIndex
CREATE INDEX "SecurityEvent_eventType_createdAt_idx" ON "SecurityEvent"("eventType", "createdAt");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_activeClientOrganizationId_fkey" FOREIGN KEY ("activeClientOrganizationId") REFERENCES "ClientOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientOrganization" ADD CONSTRAINT "ClientOrganization_proposedNovaCompanyId_fkey" FOREIGN KEY ("proposedNovaCompanyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientLegalEntity" ADD CONSTRAINT "ClientLegalEntity_clientOrganizationId_fkey" FOREIGN KEY ("clientOrganizationId") REFERENCES "ClientOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientMembership" ADD CONSTRAINT "ClientMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientMembership" ADD CONSTRAINT "ClientMembership_clientOrganizationId_fkey" FOREIGN KEY ("clientOrganizationId") REFERENCES "ClientOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPermissionOverride" ADD CONSTRAINT "ClientPermissionOverride_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "ClientMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientEmployeeScope" ADD CONSTRAINT "ClientEmployeeScope_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "ClientMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientEmployeeScope" ADD CONSTRAINT "ClientEmployeeScope_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientInvitation" ADD CONSTRAINT "ClientInvitation_clientOrganizationId_fkey" FOREIGN KEY ("clientOrganizationId") REFERENCES "ClientOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientInvitation" ADD CONSTRAINT "ClientInvitation_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientOnboardingCase" ADD CONSTRAINT "ClientOnboardingCase_clientOrganizationId_fkey" FOREIGN KEY ("clientOrganizationId") REFERENCES "ClientOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientKYBDocument" ADD CONSTRAINT "ClientKYBDocument_onboardingCaseId_fkey" FOREIGN KEY ("onboardingCaseId") REFERENCES "ClientOnboardingCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientComplianceReview" ADD CONSTRAINT "ClientComplianceReview_onboardingCaseId_fkey" FOREIGN KEY ("onboardingCaseId") REFERENCES "ClientOnboardingCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NovaEntityClientAgreement" ADD CONSTRAINT "NovaEntityClientAgreement_clientOrganizationId_fkey" FOREIGN KEY ("clientOrganizationId") REFERENCES "ClientOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NovaEntityClientAgreement" ADD CONSTRAINT "NovaEntityClientAgreement_novaCompanyId_fkey" FOREIGN KEY ("novaCompanyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgreementDocument" ADD CONSTRAINT "AgreementDocument_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "NovaEntityClientAgreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignatureEnvelope" ADD CONSTRAINT "SignatureEnvelope_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "NovaEntityClientAgreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignatureEvent" ADD CONSTRAINT "SignatureEvent_envelopeId_fkey" FOREIGN KEY ("envelopeId") REFERENCES "SignatureEnvelope"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmploymentAssignment" ADD CONSTRAINT "EmploymentAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmploymentAssignment" ADD CONSTRAINT "EmploymentAssignment_clientOrganizationId_fkey" FOREIGN KEY ("clientOrganizationId") REFERENCES "ClientOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmploymentAssignment" ADD CONSTRAINT "EmploymentAssignment_novaCompanyId_fkey" FOREIGN KEY ("novaCompanyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HireRequest" ADD CONSTRAINT "HireRequest_clientOrganizationId_fkey" FOREIGN KEY ("clientOrganizationId") REFERENCES "ClientOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HireRequest" ADD CONSTRAINT "HireRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeVerificationCheck" ADD CONSTRAINT "EmployeeVerificationCheck_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeChangeRequest" ADD CONSTRAINT "EmployeeChangeRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPricingAgreement" ADD CONSTRAINT "ClientPricingAgreement_clientOrganizationId_fkey" FOREIGN KEY ("clientOrganizationId") REFERENCES "ClientOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeFeeSchedule" ADD CONSTRAINT "EmployeeFeeSchedule_pricingAgreementId_fkey" FOREIGN KEY ("pricingAgreementId") REFERENCES "ClientPricingAgreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeFeeSchedule" ADD CONSTRAINT "EmployeeFeeSchedule_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployerCostSnapshot" ADD CONSTRAINT "EmployerCostSnapshot_clientOrganizationId_fkey" FOREIGN KEY ("clientOrganizationId") REFERENCES "ClientOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployerCostSnapshot" ADD CONSTRAINT "EmployerCostSnapshot_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployerCostSnapshot" ADD CONSTRAINT "EmployerCostSnapshot_novaCompanyId_fkey" FOREIGN KEY ("novaCompanyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPayrollApproval" ADD CONSTRAINT "ClientPayrollApproval_clientOrganizationId_fkey" FOREIGN KEY ("clientOrganizationId") REFERENCES "ClientOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollFundingRequest" ADD CONSTRAINT "PayrollFundingRequest_clientOrganizationId_fkey" FOREIGN KEY ("clientOrganizationId") REFERENCES "ClientOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientInvoice" ADD CONSTRAINT "ClientInvoice_clientOrganizationId_fkey" FOREIGN KEY ("clientOrganizationId") REFERENCES "ClientOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientInvoice" ADD CONSTRAINT "ClientInvoice_novaCompanyId_fkey" FOREIGN KEY ("novaCompanyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientInvoiceLine" ADD CONSTRAINT "ClientInvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "ClientInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientInvoiceLine" ADD CONSTRAINT "ClientInvoiceLine_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPayment" ADD CONSTRAINT "ClientPayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "ClientInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientCreditNote" ADD CONSTRAINT "ClientCreditNote_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "ClientInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientApprovalTask" ADD CONSTRAINT "ClientApprovalTask_clientOrganizationId_fkey" FOREIGN KEY ("clientOrganizationId") REFERENCES "ClientOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientActivityAudit" ADD CONSTRAINT "ClientActivityAudit_clientOrganizationId_fkey" FOREIGN KEY ("clientOrganizationId") REFERENCES "ClientOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientActivityAudit" ADD CONSTRAINT "ClientActivityAudit_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


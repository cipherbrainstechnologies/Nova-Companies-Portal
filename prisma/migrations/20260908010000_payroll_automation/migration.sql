-- CreateEnum
CREATE TYPE "EmailDeliveryPreference" AS ENUM ('OFFICIAL_PREFERRED', 'PERSONAL_PREFERRED', 'BOTH');

-- CreateEnum
CREATE TYPE "ReconciliationStatus" AS ENUM (
  'UNMATCHED',
  'MATCHED_EXACT',
  'PARTIAL_PAYMENT_REVIEW_REQUIRED',
  'AMOUNT_MISMATCH_REVIEW_REQUIRED',
  'SALARY_STRUCTURE_INCOMPLETE',
  'MANUALLY_MAPPED',
  'NON_PAYROLL',
  'IGNORED',
  'APPROVED_FOR_ISSUE',
  'ISSUED',
  'EMAIL_SENT',
  'EMAIL_FAILED'
);

-- CreateEnum
CREATE TYPE "EmailDeliveryStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED');

-- CreateEnum
CREATE TYPE "VarianceClassification" AS ENUM (
  'OVERTIME',
  'BONUS',
  'REIMBURSEMENT',
  'ADJUSTMENT',
  'ARREARS',
  'DUPLICATE_PAYMENT',
  'UNPAID_LEAVE',
  'LOAN_DEDUCTION',
  'CASH_COMPONENT',
  'OTHER'
);

-- AlterEnum AppModule
ALTER TYPE "AppModule" ADD VALUE IF NOT EXISTS 'salaryStructure';

-- AlterEnum AppAction
ALTER TYPE "AppAction" ADD VALUE IF NOT EXISTS 'reconcile';
ALTER TYPE "AppAction" ADD VALUE IF NOT EXISTS 'resendEmail';
ALTER TYPE "AppAction" ADD VALUE IF NOT EXISTS 'upload';

-- AlterTable Company
ALTER TABLE "Company"
  ADD COLUMN IF NOT EXISTS "autoIssueExactMatches" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "emailDeliveryPreference" "EmailDeliveryPreference" NOT NULL DEFAULT 'OFFICIAL_PREFERRED',
  ADD COLUMN IF NOT EXISTS "matchScoreThreshold" INTEGER NOT NULL DEFAULT 50;

-- AlterTable EmployeeBankAccount
ALTER TABLE "EmployeeBankAccount"
  ADD COLUMN IF NOT EXISTS "accountHolderName" TEXT;

-- AlterTable EmployeeSalaryStructure
ALTER TABLE "EmployeeSalaryStructure"
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "annualCtc" DECIMAL(18,2),
  ADD COLUMN IF NOT EXISTS "monthlyGross" DECIMAL(18,2),
  ADD COLUMN IF NOT EXISTS "monthlyTds" DECIMAL(18,2),
  ADD COLUMN IF NOT EXISTS "monthlyPt" DECIMAL(18,2),
  ADD COLUMN IF NOT EXISTS "expectedMonthlyNet" DECIMAL(18,2),
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable BankStatement
ALTER TABLE "BankStatement"
  ADD COLUMN IF NOT EXISTS "salaryYear" INTEGER,
  ADD COLUMN IF NOT EXISTS "salaryMonth" INTEGER;

-- AlterTable StatementTransaction
ALTER TABLE "StatementTransaction"
  ADD COLUMN IF NOT EXISTS "utrReference" TEXT,
  ADD COLUMN IF NOT EXISTS "reconciliationStatus" "ReconciliationStatus" NOT NULL DEFAULT 'UNMATCHED',
  ADD COLUMN IF NOT EXISTS "matchedEmployeeId" TEXT,
  ADD COLUMN IF NOT EXISTS "expectedAmount" DECIMAL(18,2),
  ADD COLUMN IF NOT EXISTS "actualAmount" DECIMAL(18,2),
  ADD COLUMN IF NOT EXISTS "varianceAmount" DECIMAL(18,2),
  ADD COLUMN IF NOT EXISTS "matchScore" INTEGER,
  ADD COLUMN IF NOT EXISTS "matchExplanation" TEXT,
  ADD COLUMN IF NOT EXISTS "varianceClassification" "VarianceClassification",
  ADD COLUMN IF NOT EXISTS "reviewReason" TEXT,
  ADD COLUMN IF NOT EXISTS "reviewedById" TEXT,
  ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "ignoreReason" TEXT,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable PayrollRun FK already optional statementId; ensure relation index
CREATE INDEX IF NOT EXISTS "PayrollRun_statementId_idx" ON "PayrollRun"("statementId");

-- AlterTable PayrollEmployeeLine
ALTER TABLE "PayrollEmployeeLine"
  ADD COLUMN IF NOT EXISTS "paymentStatus" "ReconciliationStatus" NOT NULL DEFAULT 'UNMATCHED',
  ADD COLUMN IF NOT EXISTS "expectedAmount" DECIMAL(18,2),
  ADD COLUMN IF NOT EXISTS "actualAmount" DECIMAL(18,2),
  ADD COLUMN IF NOT EXISTS "varianceAmount" DECIMAL(18,2),
  ADD COLUMN IF NOT EXISTS "paymentReference" TEXT,
  ADD COLUMN IF NOT EXISTS "varianceClassification" "VarianceClassification",
  ADD COLUMN IF NOT EXISTS "approvalReason" TEXT,
  ADD COLUMN IF NOT EXISTS "approvedById" TEXT,
  ADD COLUMN IF NOT EXISTS "calculationSnapshotJson" JSONB;

-- CreateTable EmployeePaymentAlias
CREATE TABLE IF NOT EXISTS "EmployeePaymentAlias" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "alias" TEXT NOT NULL,
  "normalizedAlias" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmployeePaymentAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable EmployeeSalaryStructureVersion
CREATE TABLE IF NOT EXISTS "EmployeeSalaryStructureVersion" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "annualCtc" DECIMAL(18,2),
  "monthlyGross" DECIMAL(18,2),
  "monthlyTds" DECIMAL(18,2),
  "monthlyPt" DECIMAL(18,2),
  "expectedMonthlyNet" DECIMAL(18,2),
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "effectiveTo" TIMESTAMP(3),
  "componentsJson" JSONB NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT,
  CONSTRAINT "EmployeeSalaryStructureVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable PayslipEmailDelivery
CREATE TABLE IF NOT EXISTS "PayslipEmailDelivery" (
  "id" TEXT NOT NULL,
  "payslipId" TEXT NOT NULL,
  "toEmail" TEXT NOT NULL,
  "status" "EmailDeliveryStatus" NOT NULL DEFAULT 'QUEUED',
  "providerMessageId" TEXT,
  "failureReason" TEXT,
  "resendCount" INTEGER NOT NULL DEFAULT 0,
  "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PayslipEmailDelivery_pkey" PRIMARY KEY ("id")
);

-- Indexes / uniques / FKs
CREATE UNIQUE INDEX IF NOT EXISTS "EmployeePaymentAlias_employeeId_normalizedAlias_key"
  ON "EmployeePaymentAlias"("employeeId", "normalizedAlias");
CREATE INDEX IF NOT EXISTS "EmployeePaymentAlias_employeeId_idx"
  ON "EmployeePaymentAlias"("employeeId");

CREATE UNIQUE INDEX IF NOT EXISTS "EmployeeSalaryStructureVersion_employeeId_version_key"
  ON "EmployeeSalaryStructureVersion"("employeeId", "version");
CREATE INDEX IF NOT EXISTS "EmployeeSalaryStructureVersion_employeeId_effectiveFrom_idx"
  ON "EmployeeSalaryStructureVersion"("employeeId", "effectiveFrom");

CREATE INDEX IF NOT EXISTS "StatementTransaction_reconciliationStatus_idx"
  ON "StatementTransaction"("reconciliationStatus");
CREATE INDEX IF NOT EXISTS "StatementTransaction_matchedEmployeeId_idx"
  ON "StatementTransaction"("matchedEmployeeId");

CREATE UNIQUE INDEX IF NOT EXISTS "PayrollEmployeeLine_primaryTxnId_key"
  ON "PayrollEmployeeLine"("primaryTxnId");

CREATE INDEX IF NOT EXISTS "PayslipEmailDelivery_payslipId_status_idx"
  ON "PayslipEmailDelivery"("payslipId", "status");

ALTER TABLE "EmployeePaymentAlias"
  DROP CONSTRAINT IF EXISTS "EmployeePaymentAlias_employeeId_fkey",
  ADD CONSTRAINT "EmployeePaymentAlias_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EmployeeSalaryStructureVersion"
  DROP CONSTRAINT IF EXISTS "EmployeeSalaryStructureVersion_employeeId_fkey",
  ADD CONSTRAINT "EmployeeSalaryStructureVersion_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StatementTransaction"
  DROP CONSTRAINT IF EXISTS "StatementTransaction_matchedEmployeeId_fkey",
  ADD CONSTRAINT "StatementTransaction_matchedEmployeeId_fkey"
  FOREIGN KEY ("matchedEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PayrollRun"
  DROP CONSTRAINT IF EXISTS "PayrollRun_statementId_fkey",
  ADD CONSTRAINT "PayrollRun_statementId_fkey"
  FOREIGN KEY ("statementId") REFERENCES "BankStatement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PayslipEmailDelivery"
  DROP CONSTRAINT IF EXISTS "PayslipEmailDelivery_payslipId_fkey",
  ADD CONSTRAINT "PayslipEmailDelivery_payslipId_fkey"
  FOREIGN KEY ("payslipId") REFERENCES "Payslip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

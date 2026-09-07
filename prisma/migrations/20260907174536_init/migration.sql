-- CreateEnum
CREATE TYPE "GlobalRole" AS ENUM ('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'BLOCKED', 'EXITED');

-- CreateEnum
CREATE TYPE "AppModule" AS ENUM ('dashboard', 'companies', 'employees', 'templates', 'statements', 'payroll', 'payslips', 'finance', 'tds', 'reports', 'users', 'audit');

-- CreateEnum
CREATE TYPE "AppAction" AS ENUM ('view', 'create', 'edit', 'approve', 'issue', 'download', 'manage');

-- CreateEnum
CREATE TYPE "PayrollRunStatus" AS ENUM ('DRAFT', 'PARSING', 'RECONCILIATION_REQUIRED', 'READY_FOR_REVIEW', 'APPROVED', 'ISSUING', 'ISSUED', 'FAILED', 'CANCELLED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "PayslipStatus" AS ENUM ('DRAFT', 'APPROVED', 'ISSUING', 'ISSUED', 'SUPERSEDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StatementStatus" AS ENUM ('UPLOADED', 'PARSING', 'PARSED', 'FAILED');

-- CreateEnum
CREATE TYPE "TransactionClassification" AS ENUM ('SALARY', 'OVERTIME', 'REIMBURSEMENT', 'TAX', 'EXPENSE', 'LOAN_EMI', 'OWNER_TRANSFER', 'CREDIT_CARD', 'CASH_WITHDRAWAL', 'REVENUE', 'PF_ESI', 'CONTRACTOR', 'IGNORE', 'UNCLASSIFIED');

-- CreateEnum
CREATE TYPE "MatchSuggestionStatus" AS ENUM ('SUGGESTED', 'ACCEPTED', 'REJECTED', 'NEEDS_REVIEW', 'AUTO_SELECTED');

-- CreateEnum
CREATE TYPE "TaxRegime" AS ENUM ('OLD', 'NEW');

-- CreateEnum
CREATE TYPE "DeclarationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ProfitTreatment" AS ENUM ('BUSINESS_EXPENSE', 'FINANCING_OR_PERSONAL', 'OWNER_EXCLUDED', 'REVENUE', 'IGNORE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT NOT NULL,
    "globalRole" "GlobalRole" NOT NULL,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "employeeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetOtp" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailTarget" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetOtp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PermissionGrant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "module" "AppModule" NOT NULL,
    "action" "AppAction" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PermissionGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "gstin" TEXT,
    "address" TEXT,
    "logoKey" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanySequence" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "nextNumber" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "CompanySequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyTemplate" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "htmlBody" TEXT NOT NULL,
    "cssBody" TEXT NOT NULL,
    "sourceDocKey" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "designation" TEXT,
    "department" TEXT,
    "location" TEXT,
    "dateOfJoining" TIMESTAMP(3),
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "pan" TEXT,
    "pfNumber" TEXT,
    "uan" TEXT,
    "esiNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeContact" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "personalEmail" TEXT,
    "officialEmail" TEXT,
    "primaryPhone" TEXT NOT NULL,
    "alternatePhone" TEXT,

    CONSTRAINT "EmployeeContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeBankAccount" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "bankName" TEXT,
    "accountNumber" TEXT,
    "ifsc" TEXT,
    "accountLast4" TEXT,

    CONSTRAINT "EmployeeBankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalaryComponent" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "isEarning" BOOLEAN NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SalaryComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeSalaryStructure" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "componentsJson" JSONB NOT NULL,
    "notes" TEXT,

    CONSTRAINT "EmployeeSalaryStructure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentFile" (
    "id" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "checksumSha256" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankStatement" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "bankCode" TEXT NOT NULL,
    "accountHint" TEXT,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "status" "StatementStatus" NOT NULL DEFAULT 'UPLOADED',
    "fileId" TEXT NOT NULL,
    "checksumSha256" TEXT NOT NULL,
    "parseError" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankStatement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatementTransaction" (
    "id" TEXT NOT NULL,
    "statementId" TEXT NOT NULL,
    "txnDate" TIMESTAMP(3) NOT NULL,
    "valueDate" TIMESTAMP(3),
    "particulars" TEXT NOT NULL,
    "debit" DECIMAL(18,2),
    "credit" DECIMAL(18,2),
    "balance" DECIMAL(18,2),
    "chequeNumber" TEXT,
    "branch" TEXT,
    "rowIndex" INTEGER NOT NULL,
    "classification" "TransactionClassification" NOT NULL DEFAULT 'UNCLASSIFIED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatementTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatementClassification" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "classification" "TransactionClassification" NOT NULL,
    "classifiedById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatementClassification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatementMatchSuggestion" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "breakdownJson" JSONB NOT NULL,
    "status" "MatchSuggestionStatus" NOT NULL DEFAULT 'SUGGESTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatementMatchSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeNarrationMapping" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeNarrationMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollRun" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "status" "PayrollRunStatus" NOT NULL DEFAULT 'DRAFT',
    "statementId" TEXT,
    "createdById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "issuedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollEmployeeLine" (
    "id" TEXT NOT NULL,
    "payrollRunId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "primaryTxnId" TEXT,
    "status" "PayslipStatus" NOT NULL DEFAULT 'DRAFT',
    "workingDays" DECIMAL(8,2),
    "weeklyOffs" DECIMAL(8,2),
    "paidHolidays" DECIMAL(8,2),
    "presentDays" DECIMAL(8,2),
    "casualLeave" DECIMAL(8,2),
    "privilegedLeave" DECIMAL(8,2),
    "sickLeave" DECIMAL(8,2),
    "leaveWithoutPay" DECIMAL(8,2),
    "cashComponent" DECIMAL(18,2),
    "grossEarnings" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "grossDeductions" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "netAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "amountInWords" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollEmployeeLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollEarningLine" (
    "id" TEXT NOT NULL,
    "lineId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "actual" DECIMAL(18,2) NOT NULL,
    "payable" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "PayrollEarningLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollDeductionLine" (
    "id" TEXT NOT NULL,
    "lineId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "PayrollDeductionLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payslip" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "payrollRunId" TEXT NOT NULL,
    "payrollLineId" TEXT NOT NULL,
    "status" "PayslipStatus" NOT NULL DEFAULT 'DRAFT',
    "verificationCode" TEXT NOT NULL,
    "currentVersion" INTEGER NOT NULL DEFAULT 0,
    "issuedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payslip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayslipVersion" (
    "id" TEXT NOT NULL,
    "payslipId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "templateId" TEXT NOT NULL,
    "pdfFileId" TEXT,
    "calcSnapshotFileId" TEXT,
    "sha256" TEXT,
    "correctionReason" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayslipVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentDownloadAudit" (
    "id" TEXT NOT NULL,
    "payslipId" TEXT NOT NULL,
    "userId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentDownloadAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxFinancialYearConfig" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "financialYear" TEXT NOT NULL,
    "regime" "TaxRegime" NOT NULL,
    "slabsJson" JSONB NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxFinancialYearConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeTaxDeclaration" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "financialYear" TEXT NOT NULL,
    "regime" "TaxRegime" NOT NULL,
    "status" "DeclarationStatus" NOT NULL DEFAULT 'DRAFT',
    "itemsJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeTaxDeclaration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TdsProjection" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "financialYear" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "projectedAnnual" DECIMAL(18,2) NOT NULL,
    "monthlyTds" DECIMAL(18,2) NOT NULL,
    "deductedYtd" DECIMAL(18,2) NOT NULL,
    "remaining" DECIMAL(18,2) NOT NULL,
    "assumptionsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TdsProjection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialCategory" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "treatment" "ProfitTreatment" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialTransaction" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "categoryId" TEXT,
    "txnDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "isCredit" BOOLEAN NOT NULL,
    "sourceTxnId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfitPolicyRule" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "matchPattern" TEXT NOT NULL,
    "classification" "TransactionClassification",
    "treatment" "ProfitTreatment" NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfitPolicyRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfitReportSnapshot" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "revenue" DECIMAL(18,2) NOT NULL,
    "businessExpenses" DECIMAL(18,2) NOT NULL,
    "earnedOperatingProfit" DECIMAL(18,2) NOT NULL,
    "ownerFinancingOutgoings" DECIMAL(18,2) NOT NULL,
    "cashRemaining" DECIMAL(18,2) NOT NULL,
    "detailsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfitReportSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "companyId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadataJson" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_employeeId_key" ON "User"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "PasswordResetOtp_userId_expiresAt_idx" ON "PasswordResetOtp"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "PermissionGrant_companyId_idx" ON "PermissionGrant"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "PermissionGrant_userId_companyId_module_action_key" ON "PermissionGrant"("userId", "companyId", "module", "action");

-- CreateIndex
CREATE UNIQUE INDEX "Company_prefix_key" ON "Company"("prefix");

-- CreateIndex
CREATE UNIQUE INDEX "CompanySequence_companyId_key" ON "CompanySequence"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyTemplate_companyId_version_key" ON "CompanyTemplate"("companyId", "version");

-- CreateIndex
CREATE INDEX "Employee_companyId_status_idx" ON "Employee"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_companyId_employeeCode_key" ON "Employee"("companyId", "employeeCode");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeContact_employeeId_key" ON "EmployeeContact"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeBankAccount_employeeId_key" ON "EmployeeBankAccount"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "SalaryComponent_companyId_code_key" ON "SalaryComponent"("companyId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeSalaryStructure_employeeId_key" ON "EmployeeSalaryStructure"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentFile_storageKey_key" ON "DocumentFile"("storageKey");

-- CreateIndex
CREATE INDEX "BankStatement_companyId_status_idx" ON "BankStatement"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BankStatement_companyId_checksumSha256_key" ON "BankStatement"("companyId", "checksumSha256");

-- CreateIndex
CREATE INDEX "StatementTransaction_statementId_txnDate_idx" ON "StatementTransaction"("statementId", "txnDate");

-- CreateIndex
CREATE INDEX "StatementMatchSuggestion_transactionId_score_idx" ON "StatementMatchSuggestion"("transactionId", "score");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeNarrationMapping_employeeId_normalizedName_key" ON "EmployeeNarrationMapping"("employeeId", "normalizedName");

-- CreateIndex
CREATE INDEX "PayrollRun_companyId_status_idx" ON "PayrollRun"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollRun_companyId_year_month_key" ON "PayrollRun"("companyId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollEmployeeLine_payrollRunId_employeeId_key" ON "PayrollEmployeeLine"("payrollRunId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Payslip_payrollLineId_key" ON "Payslip"("payrollLineId");

-- CreateIndex
CREATE UNIQUE INDEX "Payslip_verificationCode_key" ON "Payslip"("verificationCode");

-- CreateIndex
CREATE INDEX "Payslip_companyId_employeeId_idx" ON "Payslip"("companyId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "PayslipVersion_payslipId_version_key" ON "PayslipVersion"("payslipId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "TaxFinancialYearConfig_companyId_financialYear_regime_key" ON "TaxFinancialYearConfig"("companyId", "financialYear", "regime");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeTaxDeclaration_employeeId_financialYear_key" ON "EmployeeTaxDeclaration"("employeeId", "financialYear");

-- CreateIndex
CREATE UNIQUE INDEX "TdsProjection_employeeId_financialYear_month_key" ON "TdsProjection"("employeeId", "financialYear", "month");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialCategory_companyId_code_key" ON "FinancialCategory"("companyId", "code");

-- CreateIndex
CREATE INDEX "ProfitPolicyRule_companyId_priority_idx" ON "ProfitPolicyRule"("companyId", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "ProfitReportSnapshot_companyId_year_month_key" ON "ProfitReportSnapshot"("companyId", "year", "month");

-- CreateIndex
CREATE INDEX "AuditLog_companyId_createdAt_idx" ON "AuditLog"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetOtp" ADD CONSTRAINT "PasswordResetOtp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermissionGrant" ADD CONSTRAINT "PermissionGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermissionGrant" ADD CONSTRAINT "PermissionGrant_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanySequence" ADD CONSTRAINT "CompanySequence_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyTemplate" ADD CONSTRAINT "CompanyTemplate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeContact" ADD CONSTRAINT "EmployeeContact_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeBankAccount" ADD CONSTRAINT "EmployeeBankAccount_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryComponent" ADD CONSTRAINT "SalaryComponent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeSalaryStructure" ADD CONSTRAINT "EmployeeSalaryStructure_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankStatement" ADD CONSTRAINT "BankStatement_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankStatement" ADD CONSTRAINT "BankStatement_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "DocumentFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatementTransaction" ADD CONSTRAINT "StatementTransaction_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "BankStatement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatementClassification" ADD CONSTRAINT "StatementClassification_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "StatementTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatementMatchSuggestion" ADD CONSTRAINT "StatementMatchSuggestion_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "StatementTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatementMatchSuggestion" ADD CONSTRAINT "StatementMatchSuggestion_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeNarrationMapping" ADD CONSTRAINT "EmployeeNarrationMapping_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollEmployeeLine" ADD CONSTRAINT "PayrollEmployeeLine_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "PayrollRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollEmployeeLine" ADD CONSTRAINT "PayrollEmployeeLine_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollEmployeeLine" ADD CONSTRAINT "PayrollEmployeeLine_primaryTxnId_fkey" FOREIGN KEY ("primaryTxnId") REFERENCES "StatementTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollEarningLine" ADD CONSTRAINT "PayrollEarningLine_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "PayrollEmployeeLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollDeductionLine" ADD CONSTRAINT "PayrollDeductionLine_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "PayrollEmployeeLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "PayrollRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_payrollLineId_fkey" FOREIGN KEY ("payrollLineId") REFERENCES "PayrollEmployeeLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayslipVersion" ADD CONSTRAINT "PayslipVersion_payslipId_fkey" FOREIGN KEY ("payslipId") REFERENCES "Payslip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayslipVersion" ADD CONSTRAINT "PayslipVersion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CompanyTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayslipVersion" ADD CONSTRAINT "PayslipVersion_pdfFileId_fkey" FOREIGN KEY ("pdfFileId") REFERENCES "DocumentFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayslipVersion" ADD CONSTRAINT "PayslipVersion_calcSnapshotFileId_fkey" FOREIGN KEY ("calcSnapshotFileId") REFERENCES "DocumentFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentDownloadAudit" ADD CONSTRAINT "DocumentDownloadAudit_payslipId_fkey" FOREIGN KEY ("payslipId") REFERENCES "Payslip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxFinancialYearConfig" ADD CONSTRAINT "TaxFinancialYearConfig_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeTaxDeclaration" ADD CONSTRAINT "EmployeeTaxDeclaration_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TdsProjection" ADD CONSTRAINT "TdsProjection_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialCategory" ADD CONSTRAINT "FinancialCategory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FinancialCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfitPolicyRule" ADD CONSTRAINT "ProfitPolicyRule_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfitReportSnapshot" ADD CONSTRAINT "ProfitReportSnapshot_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TYPE "EmployeeStatus" ADD VALUE 'CONTACT_DETAILS_REQUIRED';

ALTER TABLE "Employee" ADD COLUMN "displayName" TEXT;
ALTER TABLE "EmployeeContact" ALTER COLUMN "primaryPhone" DROP NOT NULL;

CREATE TYPE "EmployeeImportBatchStatus" AS ENUM ('PENDING', 'PREVIEWED', 'COMMITTED', 'FAILED');
CREATE TYPE "EmployeeImportRowStatus" AS ENUM ('PENDING', 'CREATED', 'UPDATED', 'SKIPPED', 'ERROR');

CREATE TABLE "EmployeeImportBatch" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "actorUserId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "status" "EmployeeImportBatchStatus" NOT NULL DEFAULT 'PENDING',
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "createdCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "effectiveFrom" TIMESTAMP(3),
    "summaryJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EmployeeImportBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EmployeeImportRow" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "rawJson" JSONB NOT NULL,
    "status" "EmployeeImportRowStatus" NOT NULL DEFAULT 'PENDING',
    "employeeId" TEXT,
    "errorsJson" JSONB,
    "warningsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmployeeImportRow_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EmployeeImportBatch_companyId_createdAt_idx" ON "EmployeeImportBatch"("companyId", "createdAt");
CREATE INDEX "EmployeeImportBatch_actorUserId_createdAt_idx" ON "EmployeeImportBatch"("actorUserId", "createdAt");
CREATE UNIQUE INDEX "EmployeeImportRow_batchId_rowNumber_key" ON "EmployeeImportRow"("batchId", "rowNumber");
CREATE INDEX "EmployeeImportRow_employeeId_idx" ON "EmployeeImportRow"("employeeId");

ALTER TABLE "EmployeeImportBatch"
ADD CONSTRAINT "EmployeeImportBatch_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EmployeeImportRow"
ADD CONSTRAINT "EmployeeImportRow_batchId_fkey"
FOREIGN KEY ("batchId") REFERENCES "EmployeeImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EmployeeImportRow"
ADD CONSTRAINT "EmployeeImportRow_employeeId_fkey"
FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "StatementTransaction" ADD COLUMN IF NOT EXISTS "salaryYear" INTEGER;
ALTER TABLE "StatementTransaction" ADD COLUMN IF NOT EXISTS "salaryMonth" INTEGER;
ALTER TABLE "StatementTransaction" ADD COLUMN IF NOT EXISTS "fingerprint" TEXT;
ALTER TABLE "StatementTransaction" ADD COLUMN IF NOT EXISTS "isDuplicate" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "StatementTransaction_fingerprint_idx" ON "StatementTransaction"("fingerprint");
CREATE INDEX IF NOT EXISTS "StatementTransaction_salaryYear_salaryMonth_idx" ON "StatementTransaction"("salaryYear", "salaryMonth");

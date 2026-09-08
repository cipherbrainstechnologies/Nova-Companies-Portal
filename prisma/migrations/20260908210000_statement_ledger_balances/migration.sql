-- Bank statement ledger reconciliation fields
ALTER TABLE "BankStatement" ADD COLUMN IF NOT EXISTS "accountNumber" TEXT;
ALTER TABLE "BankStatement" ADD COLUMN IF NOT EXISTS "openingBalance" DECIMAL(18,2);
ALTER TABLE "BankStatement" ADD COLUMN IF NOT EXISTS "statementClosingBalance" DECIMAL(18,2);
ALTER TABLE "BankStatement" ADD COLUMN IF NOT EXISTS "calculatedClosingBalance" DECIMAL(18,2);
ALTER TABLE "BankStatement" ADD COLUMN IF NOT EXISTS "reconciliationDifference" DECIMAL(18,2);
ALTER TABLE "BankStatement" ADD COLUMN IF NOT EXISTS "totalCredits" DECIMAL(18,2);
ALTER TABLE "BankStatement" ADD COLUMN IF NOT EXISTS "totalDebits" DECIMAL(18,2);
ALTER TABLE "BankStatement" ADD COLUMN IF NOT EXISTS "transactionCount" INTEGER;
ALTER TABLE "BankStatement" ADD COLUMN IF NOT EXISTS "parserVersion" TEXT;
ALTER TABLE "BankStatement" ADD COLUMN IF NOT EXISTS "statementReconciled" BOOLEAN NOT NULL DEFAULT false;

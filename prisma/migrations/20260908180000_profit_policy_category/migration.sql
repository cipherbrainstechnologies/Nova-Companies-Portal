-- AlterTable
ALTER TABLE "ProfitPolicyRule" ADD COLUMN IF NOT EXISTS "categoryKey" TEXT;
ALTER TABLE "ProfitPolicyRule" ADD COLUMN IF NOT EXISTS "label" TEXT;

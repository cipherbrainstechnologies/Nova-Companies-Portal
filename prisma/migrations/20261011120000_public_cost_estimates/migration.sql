-- Public marketing cost estimates and quote requests (Sprint 3–4)

CREATE TYPE "PublicQuoteRequestStatus" AS ENUM ('SUBMITTED', 'ACKNOWLEDGED', 'CLOSED');

CREATE TABLE "PublicPricingPlan" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "feePerEmployeeInr" DECIMAL(12,2) NOT NULL,
    "onboardingFeeInr" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicPricingPlan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PublicPricingPlan_code_key" ON "PublicPricingPlan"("code");

CREATE TABLE "PublicCostEstimate" (
    "id" TEXT NOT NULL,
    "publicReference" TEXT NOT NULL,
    "inputsJson" JSONB NOT NULL,
    "breakdownJson" JSONB NOT NULL,
    "headcount" INTEGER NOT NULL,
    "billingCurrency" TEXT NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicCostEstimate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PublicCostEstimate_publicReference_key" ON "PublicCostEstimate"("publicReference");
CREATE INDEX "PublicCostEstimate_expiresAt_idx" ON "PublicCostEstimate"("expiresAt");

CREATE TABLE "PublicQuoteRequest" (
    "id" TEXT NOT NULL,
    "status" "PublicQuoteRequestStatus" NOT NULL DEFAULT 'SUBMITTED',
    "estimateId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "organisation" TEXT,
    "phone" TEXT,
    "message" TEXT NOT NULL,
    "headcount" INTEGER,
    "geography" TEXT,
    "hiringTiming" TEXT,
    "consentAt" TIMESTAMP(3) NOT NULL,
    "attributionJson" JSONB,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicQuoteRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PublicQuoteRequest_email_createdAt_idx" ON "PublicQuoteRequest"("email", "createdAt");
CREATE INDEX "PublicQuoteRequest_estimateId_idx" ON "PublicQuoteRequest"("estimateId");

ALTER TABLE "PublicQuoteRequest" ADD CONSTRAINT "PublicQuoteRequest_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "PublicCostEstimate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

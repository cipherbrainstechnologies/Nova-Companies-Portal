import { prisma } from "@/server/db";
import { randomBytes } from "node:crypto";
import {
  buildEmployerCostEstimate,
  type EmployerCostEstimateInput,
} from "@/server/public/employer-cost-estimate";
import { resolvePublicPricingPlan } from "@/server/public/pricing-plans";
import type { BillingCurrency } from "@/server/public/fx-indicative";

const ESTIMATE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function newPublicReference(): string {
  return `EST-${randomBytes(4).toString("hex").toUpperCase()}`;
}

export async function createPublicCostEstimate(
  input: EmployerCostEstimateInput,
  ipHash?: string,
) {
  const plan = await resolvePublicPricingPlan(input.planCode);
  const breakdown = buildEmployerCostEstimate(input, plan);
  const publicReference = newPublicReference();
  const expiresAt = new Date(Date.now() + ESTIMATE_TTL_MS);

  const row = await prisma.publicCostEstimate.create({
    data: {
      publicReference,
      inputsJson: input as object,
      breakdownJson: breakdown as object,
      headcount: breakdown.consolidated.headcount,
      billingCurrency: input.billingCurrency,
      expiresAt,
      ipHash,
    },
  });

  return { id: row.id, publicReference, breakdown, expiresAt: expiresAt.toISOString() };
}

export async function getPublicCostEstimateByReference(publicReference: string) {
  const row = await prisma.publicCostEstimate.findUnique({
    where: { publicReference },
  });
  if (!row) return null;
  if (row.expiresAt < new Date()) return { expired: true as const, publicReference };
  return {
    expired: false as const,
    publicReference: row.publicReference,
    breakdown: row.breakdownJson,
    inputs: row.inputsJson,
    headcount: row.headcount,
    billingCurrency: row.billingCurrency,
    calculatedAt: row.calculatedAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
  };
}

export function parseBillingCurrency(raw: string): BillingCurrency {
  const c = raw.toUpperCase();
  if (c === "INR" || c === "GBP" || c === "USD" || c === "EUR" || c === "AUD") return c;
  throw new Error("Unsupported billing currency");
}

import { prisma } from "@/server/db";
import { Decimal } from "@prisma/client/runtime/library";

export type ResolvedPricingPlan = {
  code: string;
  label: string;
  feePerEmployeeInr: number;
  onboardingFeeInr: number;
  version: number;
};

const FALLBACK_PLAN: ResolvedPricingPlan = {
  code: "standard",
  label: "Standard EOR (indicative)",
  feePerEmployeeInr: Number(process.env.PUBLIC_DEFAULT_EOR_FEE_INR ?? "0"),
  onboardingFeeInr: Number(process.env.PUBLIC_DEFAULT_ONBOARDING_FEE_INR ?? "0"),
  version: 0,
};

export async function resolvePublicPricingPlan(planCode?: string): Promise<ResolvedPricingPlan> {
  const code = planCode?.trim() || "standard";
  const row = await prisma.publicPricingPlan.findFirst({
    where: { code, isActive: true },
    orderBy: { version: "desc" },
  });
  if (!row) {
    if (code !== "standard") {
      throw new Error(`Unknown pricing plan: ${code}`);
    }
    return FALLBACK_PLAN;
  }
  return {
    code: row.code,
    label: row.label,
    feePerEmployeeInr: Number(row.feePerEmployeeInr),
    onboardingFeeInr: Number(row.onboardingFeeInr),
    version: row.version,
  };
}

export function decimalMoney(n: number): string {
  return new Decimal(n).toFixed(2);
}

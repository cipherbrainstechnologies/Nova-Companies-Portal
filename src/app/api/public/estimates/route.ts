import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  assertPublicRateLimit,
  hashClientIp,
  PublicRateLimitError,
} from "@/server/public/rate-limit";
import { createPublicCostEstimate, parseBillingCurrency } from "@/server/public/estimate-service";

const bodySchema = z.object({
  compensationBasis: z.enum(["GROSS", "CTC"]).default("GROSS"),
  monthlyCompensationInr: z.number().finite().positive(),
  headcount: z.number().int().min(1).max(500).default(1),
  stateCode: z.string().trim().max(8).optional(),
  monthlyBenefitsInr: z.number().finite().min(0).optional(),
  billingCurrency: z.string().trim().min(3).max(3),
  planCode: z.string().trim().max(40).optional(),
});

export async function POST(req: NextRequest) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null;
  const ipHash = hashClientIp(ip);

  try {
    await assertPublicRateLimit("public_estimate", ipHash);
  } catch (e) {
    if (e instanceof PublicRateLimitError) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
    throw e;
  }

  let billingCurrency;
  try {
    billingCurrency = parseBillingCurrency(parsed.data.billingCurrency);
  } catch {
    return NextResponse.json({ error: "invalid", fields: ["billingCurrency"] }, { status: 400 });
  }

  try {
    const result = await createPublicCostEstimate(
      {
        ...parsed.data,
        billingCurrency,
      },
      ipHash,
    );
    return NextResponse.json({
      publicReference: result.publicReference,
      expiresAt: result.expiresAt,
      breakdown: result.breakdown,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "estimate_failed";
    return NextResponse.json({ error: "invalid", message }, { status: 400 });
  }
}

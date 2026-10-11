import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db";
import { sendEmail } from "@/server/email";
import {
  assertPublicRateLimit,
  hashClientIp,
  PublicRateLimitError,
} from "@/server/public/rate-limit";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  organisation: z.string().trim().max(160).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  message: z.string().trim().min(20).max(4000),
  headcount: z.coerce.number().int().min(1).max(500).optional(),
  geography: z.string().trim().max(120).optional().or(z.literal("")),
  hiringTiming: z.string().trim().max(80).optional().or(z.literal("")),
  estimateReference: z.string().trim().max(20).optional().or(z.literal("")),
  consent: z.literal(true),
  website: z.string().max(200).optional().or(z.literal("")),
  attribution: z
    .object({
      utmSource: z.string().max(120).optional(),
      utmMedium: z.string().max(120).optional(),
      utmCampaign: z.string().max(120).optional(),
      page: z.string().max(200).optional(),
    })
    .optional(),
});

export async function POST(req: NextRequest) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => String(issue.path[0] ?? ""));
    return NextResponse.json({ error: "invalid", fields }, { status: 400 });
  }

  if (parsed.data.website) {
    return NextResponse.json({ ok: true });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null;
  const ipHash = hashClientIp(ip);

  try {
    await assertPublicRateLimit("public_quote", ipHash);
  } catch (e) {
    if (e instanceof PublicRateLimitError) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
    throw e;
  }

  let estimateId: string | undefined;
  const ref = parsed.data.estimateReference?.toUpperCase();
  if (ref) {
    const estimate = await prisma.publicCostEstimate.findUnique({
      where: { publicReference: ref },
    });
    if (estimate && estimate.expiresAt >= new Date()) {
      estimateId = estimate.id;
    }
  }

  const row = await prisma.publicQuoteRequest.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      organisation: parsed.data.organisation || null,
      phone: parsed.data.phone || null,
      message: parsed.data.message,
      headcount: parsed.data.headcount ?? null,
      geography: parsed.data.geography || null,
      hiringTiming: parsed.data.hiringTiming || null,
      consentAt: new Date(),
      attributionJson: parsed.data.attribution ?? undefined,
      estimateId,
      ipHash,
    },
  });

  const inbox = process.env.CONTACT_INBOX ?? "thenovaworkforce@gmail.com";
  try {
    await sendEmail({
      to: inbox,
      subject: `NOVA proposal request (${row.id.slice(-8)})`,
      text: [
        `Name: ${parsed.data.name}`,
        `Email: ${parsed.data.email}`,
        `Company: ${parsed.data.organisation || "-"}`,
        `Phone: ${parsed.data.phone || "-"}`,
        `Headcount: ${parsed.data.headcount ?? "-"}`,
        `Geography: ${parsed.data.geography || "-"}`,
        `Timing: ${parsed.data.hiringTiming || "-"}`,
        `Estimate ref: ${ref || "-"}`,
        "",
        parsed.data.message,
      ].join("\n"),
    });
  } catch (error) {
    console.error("[quote-request] send failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "send" }, { status: 502 });
  }

  return NextResponse.json({ ok: true, id: row.id });
}

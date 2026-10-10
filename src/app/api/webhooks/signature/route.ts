import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleSignatureWebhook } from "@/server/client/signature-service";

const schema = z.object({
  idempotencyKey: z.string().min(8),
  envelopeId: z.string(),
  providerEventId: z.string(),
  status: z.enum(["COMPLETED", "DECLINED", "EXPIRED"]),
  signerEmail: z.string().email().optional(),
  signerName: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const secret = process.env.SIGNATURE_WEBHOOK_SECRET;
  if (secret) {
    const header = req.headers.get("x-signature-webhook-secret");
    if (header !== secret) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  try {
    const body = schema.parse(await req.json());
    const result = await handleSignatureWebhook(body);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
}

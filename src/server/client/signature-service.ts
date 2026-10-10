import { prisma } from "@/server/db";
import { withIdempotency } from "@/server/client/idempotency";

export async function handleSignatureWebhook(input: {
  idempotencyKey: string;
  envelopeId: string;
  providerEventId: string;
  status: "COMPLETED" | "DECLINED" | "EXPIRED";
  signerEmail?: string;
  signerName?: string;
}) {
  return withIdempotency({
    key: input.idempotencyKey,
    operation: "signature.webhook",
    ttlMs: 7 * 24 * 60 * 60 * 1000,
    run: async () => {
      const envelope = await prisma.signatureEnvelope.findUnique({
        where: { id: input.envelopeId },
        include: { agreement: true },
      });
      if (!envelope) return { ok: false, reason: "unknown_envelope" };
      if (envelope.status === "COMPLETED") return { ok: true, duplicate: true };

      if (input.status === "COMPLETED") {
        await prisma.$transaction([
          prisma.signatureEnvelope.update({
            where: { id: envelope.id },
            data: { status: "COMPLETED", completedAt: new Date() },
          }),
          prisma.signatureEvent.create({
            data: {
              envelopeId: envelope.id,
              signerName: input.signerName ?? "Signer",
              signerEmail: input.signerEmail ?? "unknown@example.com",
              signedAt: new Date(),
              evidenceJson: { providerEventId: input.providerEventId },
            },
          }),
        ]);
      } else {
        await prisma.signatureEnvelope.update({
          where: { id: envelope.id },
          data: { status: input.status },
        });
      }

      return { ok: true };
    },
  });
}

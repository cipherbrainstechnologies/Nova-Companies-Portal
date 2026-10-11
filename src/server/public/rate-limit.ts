import { prisma } from "@/server/db";
import { createHash } from "node:crypto";

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;

export function hashClientIp(ip: string | null): string {
  const raw = ip?.trim() || "unknown";
  return createHash("sha256").update(`public-api:${raw}`).digest("hex").slice(0, 32);
}

export async function assertPublicRateLimit(bucket: string, ipHash: string): Promise<void> {
  const since = new Date(Date.now() - WINDOW_MS);
  const eventType = `${bucket}:${ipHash}`;
  const count = await prisma.securityEvent.count({
    where: {
      eventType,
      createdAt: { gte: since },
    },
  });
  if (count >= MAX_PER_WINDOW) {
    throw new PublicRateLimitError();
  }
  await prisma.securityEvent.create({
    data: {
      eventType,
      metadataJson: { bucket, ipHash },
    },
  });
}

export class PublicRateLimitError extends Error {
  constructor() {
    super("rate_limited");
    this.name = "PublicRateLimitError";
  }
}

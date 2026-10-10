import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";

export async function withIdempotency<T>(input: {
  key: string;
  operation: string;
  ttlMs: number;
  run: () => Promise<T>;
}): Promise<T> {
  const existing = await prisma.idempotencyRecord.findUnique({ where: { key: input.key } });
  if (existing?.responseJson) {
    return existing.responseJson as T;
  }

  const result = await input.run();
  await prisma.idempotencyRecord.upsert({
    where: { key: input.key },
    create: {
      key: input.key,
      operation: input.operation,
      responseJson: result as Prisma.InputJsonValue,
      expiresAt: new Date(Date.now() + input.ttlMs),
    },
    update: {
      responseJson: result as Prisma.InputJsonValue,
      expiresAt: new Date(Date.now() + input.ttlMs),
    },
  });
  return result;
}

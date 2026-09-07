import { prisma } from "@/server/db";
import type { Prisma } from "@prisma/client";

export async function writeAudit(input: {
  actorUserId?: string | null;
  companyId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
}) {
  return prisma.auditLog.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      companyId: input.companyId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      metadataJson: input.metadata,
      ipAddress: input.ipAddress ?? null,
    },
  });
}

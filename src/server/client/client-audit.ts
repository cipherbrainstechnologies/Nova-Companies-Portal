import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";

export async function writeClientActivity(input: {
  clientOrganizationId: string;
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.clientActivityAudit.create({
    data: {
      clientOrganizationId: input.clientOrganizationId,
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      metadataJson: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}

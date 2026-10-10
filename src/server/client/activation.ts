import type { ClientOrganization } from "@prisma/client";
import { prisma } from "@/server/db";

export type ActivationBlocker = { code: string; message: string };

/** Mandatory gates before lifecycle ACTIVE — no developer bypass. */
export async function getClientActivationBlockers(
  client: Pick<ClientOrganization, "id" | "lifecycleStatus" | "proposedNovaCompanyId">,
): Promise<ActivationBlocker[]> {
  const blockers: ActivationBlocker[] = [];

  const reviews = await prisma.clientComplianceReview.findMany({
    where: { onboardingCase: { clientOrganizationId: client.id } },
    orderBy: { createdAt: "desc" },
    take: 1,
  });
  const latestReview = reviews[0];
  if (!latestReview || latestReview.outcome !== "APPROVED") {
    blockers.push({ code: "KYB", message: "KYB compliance approval is required" });
  }

  if (!client.proposedNovaCompanyId) {
    blockers.push({ code: "NOVA_ENTITY", message: "NOVA employing entity must be assigned" });
  }

  const agreement = await prisma.novaEntityClientAgreement.findFirst({
    where: { clientOrganizationId: client.id, effectiveTo: null },
    include: { signatureEnvelopes: true },
  });
  if (!agreement) {
    blockers.push({ code: "CONTRACT", message: "Executed client agreement is required" });
  } else {
    const signed = agreement.signatureEnvelopes.some((e) => e.status === "COMPLETED");
    if (!signed) {
      blockers.push({ code: "SIGNATURE", message: "All mandatory agreements must be fully signed" });
    }
  }

  const pricing = await prisma.clientPricingAgreement.findFirst({
    where: { clientOrganizationId: client.id, effectiveTo: null },
  });
  if (!pricing) {
    blockers.push({ code: "PRICING", message: "Approved pricing schedule is required" });
  }

  return blockers;
}

export async function canActivateClient(clientId: string): Promise<{
  ok: boolean;
  blockers: ActivationBlocker[];
}> {
  const client = await prisma.clientOrganization.findUniqueOrThrow({ where: { id: clientId } });
  const blockers = await getClientActivationBlockers(client);
  return { ok: blockers.length === 0, blockers };
}

import { NextResponse } from "next/server";
import { apiError } from "@/server/api-helpers";
import { requireSessionUser } from "@/server/auth/session";
import { requireClientCapability } from "@/server/client/client-authz";
import { prisma } from "@/server/db";
import { getSignedDownloadUrl } from "@/server/storage/s3";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ clientSlug: string }> },
) {
  try {
    const { clientSlug } = await ctx.params;
    const user = await requireSessionUser();
    const membership = await requireClientCapability({
      user,
      clientSlug,
      module: "documents",
      action: "VIEW",
    });
    const agreements = await prisma.novaEntityClientAgreement.findMany({
      where: { clientOrganizationId: membership.clientOrganizationId },
      include: { documents: true, signatureEnvelopes: true },
    });
    const executed = await prisma.clientLegalDocument.findMany({
      where: {
        clientOrganizationId: membership.clientOrganizationId,
        status: "FULLY_EXECUTED",
      },
      select: {
        id: true,
        templateCode: true,
        templateVersion: true,
        signedAt: true,
        signatoryName: true,
        executedStorageKey: true,
      },
    });
    const legalDocuments = [];
    for (const doc of executed) {
      let downloadUrl: string | null = null;
      if (doc.executedStorageKey) {
        try {
          downloadUrl = await getSignedDownloadUrl(doc.executedStorageKey, 120);
        } catch {
          downloadUrl = null;
        }
      }
      legalDocuments.push({
        id: doc.id,
        templateCode: doc.templateCode,
        templateVersion: doc.templateVersion,
        signedAt: doc.signedAt,
        signatoryName: doc.signatoryName,
        downloadUrl,
      });
    }
    return NextResponse.json({ agreements, legalDocuments });
  } catch (error) {
    return apiError(error);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/server/api-helpers";
import { requireSessionUser } from "@/server/auth/session";
import { requireNovaClientAdmin } from "@/server/client/client-authz";
import { transitionLegalDocument } from "@/server/client/legal-document-service";
import { prisma } from "@/server/db";
import { getSignedDownloadUrl } from "@/server/storage/s3";

const actionSchema = z.object({
  action: z.enum(["review", "approve_signature", "send", "execute", "decline", "void"]),
  signatoryName: z.string().optional(),
  signatoryEmail: z.string().email().optional(),
  signedAt: z.string().optional(),
  executedPdfBase64: z.string().optional(),
  executedFileName: z.string().optional(),
});

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ clientId: string; documentId: string }> },
) {
  try {
    const user = await requireSessionUser();
    await requireNovaClientAdmin(user);
    const { clientId, documentId } = await ctx.params;
    const doc = await prisma.clientLegalDocument.findFirst({
      where: { id: documentId, clientOrganizationId: clientId },
    });
    if (!doc?.storageKey && !doc?.executedStorageKey) {
      return NextResponse.json({ error: "No file" }, { status: 404 });
    }
    const key = doc.executedStorageKey ?? doc.storageKey;
    const url = await getSignedDownloadUrl(key!, 120);
    return NextResponse.redirect(url);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ clientId: string; documentId: string }> },
) {
  try {
    const user = await requireSessionUser();
    await requireNovaClientAdmin(user);
    const { clientId, documentId } = await ctx.params;
    const body = actionSchema.parse(await req.json());
    const executedFile = body.executedPdfBase64
      ? {
          buffer: Buffer.from(body.executedPdfBase64, "base64"),
          mimeType: "application/pdf",
          originalName: body.executedFileName || "executed.pdf",
        }
      : undefined;
    const document = await transitionLegalDocument({
      actorUserId: user.id,
      clientId,
      documentId,
      action: body.action,
      signatoryName: body.signatoryName,
      signatoryEmail: body.signatoryEmail,
      signedAt: body.signedAt,
      executedFile,
    });
    return NextResponse.json({ document });
  } catch (error) {
    return apiError(error);
  }
}

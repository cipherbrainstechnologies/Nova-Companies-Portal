import { NextResponse } from "next/server";
import { requireSessionUser } from "@/server/auth/session";
import { authorize, apiError } from "@/server/api-helpers";
import { companyFacade } from "@/server/facades/company-facade";
import { storePrivateFile, getSignedDownloadUrl } from "@/server/storage/s3";
import { t } from "@/i18n";

const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);

const MAX_BYTES = 2 * 1024 * 1024;

type Context = { params: Promise<{ companyId: string }> };

export async function GET(_: Request, { params }: Context) {
  try {
    const user = await requireSessionUser();
    const { companyId } = await params;
    await authorize(user, companyId, "companies", "view");
    const company = await companyFacade.getCompany(companyId);
    if (!company.logoKey) {
      return NextResponse.json({ error: t("en", "company.logo.missing") }, { status: 404 });
    }
    const expectedPrefix = `companies/${companyId}/logo/`;
    if (!company.logoKey.startsWith(expectedPrefix)) {
      return NextResponse.json({ error: t("en", "company.logo.missing") }, { status: 404 });
    }
    const url = await getSignedDownloadUrl(company.logoKey, 180);
    return NextResponse.redirect(url);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request, { params }: Context) {
  try {
    const user = await requireSessionUser();
    const { companyId } = await params;
    await authorize(user, companyId, "companies", "edit");

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: t("en", "company.logo.fileRequired") }, { status: 400 });
    }

    const mimeType = file.type || "application/octet-stream";
    if (!ALLOWED_MIME.has(mimeType)) {
      return NextResponse.json({ error: t("en", "company.logo.unsupportedType") }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length > MAX_BYTES) {
      return NextResponse.json({ error: t("en", "company.logo.tooLarge") }, { status: 400 });
    }

    const stored = await storePrivateFile({
      buffer,
      mimeType,
      originalName: file.name || "logo",
      prefix: `companies/${companyId}/logo`,
      dedupeByChecksum: false,
    });

    const company = await companyFacade.updateCompany({
      actorUserId: user.id,
      companyId,
      logoKey: stored.storageKey,
    });

    const url = await getSignedDownloadUrl(stored.storageKey, 180);
    return NextResponse.json({
      logoKey: company.logoKey,
      url,
      mimeType: stored.mimeType,
      sizeBytes: stored.sizeBytes,
    });
  } catch (error) {
    return apiError(error);
  }
}

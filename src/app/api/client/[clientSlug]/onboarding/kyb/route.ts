import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/server/api-helpers";
import { requireSessionUser } from "@/server/auth/session";
import { requireClientCapability } from "@/server/client/client-authz";
import { assertClientPortalActor } from "@/server/client/mutation-guard";
import { simpleMalwareHeuristic, uploadKybDocument } from "@/server/client/kyb-service";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ clientSlug: string }> },
) {
  try {
    const { clientSlug } = await ctx.params;
    const user = await requireSessionUser();
    const membership = await requireClientCapability({
      user,
      clientSlug,
      module: "onboarding",
      action: "EDIT",
    });
    assertClientPortalActor(membership);

    const form = await req.formData();
    const category = String(form.get("category") ?? "LEGAL_IDENTITY");
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    if (simpleMalwareHeuristic(buffer)) {
      return NextResponse.json({ error: "file rejected" }, { status: 400 });
    }

    const doc = await uploadKybDocument({
      clientOrganizationId: membership.clientOrganizationId,
      actorUserId: user.id,
      category,
      buffer,
      mimeType: file.type || "application/octet-stream",
      originalName: file.name,
    });
    return NextResponse.json({ document: doc });
  } catch (error) {
    return apiError(error);
  }
}

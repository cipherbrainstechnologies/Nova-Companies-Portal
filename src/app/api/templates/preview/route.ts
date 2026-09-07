import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/server/auth/session";
import { authorize, apiError } from "@/server/api-helpers";
import { templateFacade } from "@/server/facades/template-facade";

const schema = z.object({
  companyId: z.string().min(1).optional(),
  htmlBody: z.string().optional(),
  cssBody: z.string().optional(),
  useActiveTemplate: z.boolean().optional(),
  sample: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    const body = schema.parse(await request.json());
    const companyId = body.companyId ?? "";
    if (!companyId) {
      return NextResponse.json({ error: "companyId is required" }, { status: 400 });
    }
    await authorize(user, companyId, "templates", "view");

    let htmlBody = body.htmlBody;
    let cssBody = body.cssBody;
    if (body.useActiveTemplate || (!htmlBody?.trim() && body.sample !== false)) {
      const active = await templateFacade.getActiveTemplate(companyId);
      if (active) {
        htmlBody = htmlBody?.trim() ? htmlBody : active.htmlBody;
        cssBody = cssBody?.trim() ? cssBody : active.cssBody;
      }
    }

    const result = await templateFacade.previewTemplateHtml({ htmlBody, cssBody });
    return NextResponse.json({ html: result.html, sample: true });
  } catch (error) {
    return apiError(error);
  }
}

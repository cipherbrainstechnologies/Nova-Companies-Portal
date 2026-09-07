import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/server/auth/session";
import { authorize, apiError } from "@/server/api-helpers";
import { templateFacade } from "@/server/facades/template-facade";

const jsonSchema = z.object({
  companyId: z.string().min(1),
  name: z.string().min(1).max(200).optional(),
  htmlBody: z.string().min(1).max(1_000_000),
  cssBody: z.string().max(200_000).optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireSessionUser();
    const companyId = new URL(request.url).searchParams.get("companyId") ?? "";
    await authorize(user, companyId, "templates", "view");
    return NextResponse.json(await templateFacade.listTemplates(companyId));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const companyId = String(form.get("companyId") ?? "");
      await authorize(user, companyId, "templates", "create");
      const name = form.get("name") ? String(form.get("name")) : undefined;
      const cssBody = form.get("cssBody") ? String(form.get("cssBody")) : undefined;
      const file = form.get("file");
      let htmlBody = form.get("htmlBody") ? String(form.get("htmlBody")) : "";
      let sourceFile: { buffer: Buffer; mimeType: string; originalName: string } | undefined;

      if (file instanceof File && file.size > 0) {
        if (file.size > 1_000_000) {
          return NextResponse.json({ error: "Template file exceeds 1MB limit" }, { status: 413 });
        }
        const nameLower = file.name.toLowerCase();
        if (!/\.(html?|txt)$/.test(nameLower)) {
          return NextResponse.json(
            { error: "Only .html, .htm, or .txt template files are accepted" },
            { status: 400 },
          );
        }
        const buffer = Buffer.from(await file.arrayBuffer());
        htmlBody = buffer.toString("utf8");
        sourceFile = {
          buffer,
          mimeType: file.type || "text/html",
          originalName: file.name,
        };
      }

      if (!htmlBody.trim()) {
        return NextResponse.json({ error: "htmlBody or file is required" }, { status: 400 });
      }

      const template = await templateFacade.createTemplateVersion({
        actorUserId: user.id,
        companyId,
        name: name ?? (file instanceof File ? file.name.replace(/\.[^.]+$/, "") : "Payslip template"),
        htmlBody,
        cssBody,
        sourceFile,
      });
      return NextResponse.json(template, { status: 201 });
    }

    const body = jsonSchema.parse(await request.json());
    await authorize(user, body.companyId, "templates", "create");
    const template = await templateFacade.createTemplateVersion({
      actorUserId: user.id,
      companyId: body.companyId,
      name: body.name ?? "Payslip template",
      htmlBody: body.htmlBody,
      cssBody: body.cssBody,
    });
    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

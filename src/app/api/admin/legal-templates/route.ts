import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/server/api-helpers";
import { requireSessionUser } from "@/server/auth/session";
import { requireNovaClientAdmin } from "@/server/client/client-authz";
import { ensureLegalTemplateLibrary } from "@/server/client/legal-document-service";
import { LEGAL_REVIEW_FLAGS, LEGAL_TEMPLATE_SEEDS } from "@/server/client/legal-documents";
import { prisma } from "@/server/db";
import { writeAudit } from "@/server/audit";

export async function GET() {
  try {
    const user = await requireSessionUser();
    await requireNovaClientAdmin(user);
    await ensureLegalTemplateLibrary();
    const templates = await prisma.legalTemplate.findMany({
      orderBy: [{ code: "asc" }, { version: "desc" }],
      include: { _count: { select: { documents: true } } },
    });
    return NextResponse.json({ templates });
  } catch (error) {
    return apiError(error);
  }
}

const versionSchema = z.object({
  code: z.string().min(2),
  bodyMarkdown: z.string().min(20).optional(),
  action: z.enum(["version", "approve", "retire"]),
  templateId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireSessionUser();
    await requireNovaClientAdmin(user);
    if (user.globalRole !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Only a Super Admin can change legal templates" }, { status: 403 });
    }
    const body = versionSchema.parse(await req.json());

    if (body.action === "approve" || body.action === "retire") {
      if (!body.templateId) return NextResponse.json({ error: "Template id required" }, { status: 400 });
      const template = await prisma.legalTemplate.update({
        where: { id: body.templateId },
        data:
          body.action === "approve"
            ? { status: "APPROVED", approvedAt: new Date(), approvedByUserId: user.id }
            : { status: "RETIRED", retiredAt: new Date() },
      });
      await writeAudit({
        actorUserId: user.id,
        action: `legal.template.${body.action}`,
        entityType: "LegalTemplate",
        entityId: template.id,
      });
      return NextResponse.json({ template });
    }

    const seed = LEGAL_TEMPLATE_SEEDS.find((item) => item.code === body.code);
    if (!seed || !body.bodyMarkdown) {
      return NextResponse.json({ error: "Template body is required" }, { status: 400 });
    }
    const max = await prisma.legalTemplate.aggregate({
      where: { code: body.code },
      _max: { version: true },
    });
    const template = await prisma.legalTemplate.create({
      data: {
        code: seed.code,
        name: seed.name,
        version: (max._max.version ?? 0) + 1,
        status: "DRAFT",
        bodyMarkdown: body.bodyMarkdown,
        requiredVariables: seed.requiredVariables,
        legalFlags: [...LEGAL_REVIEW_FLAGS],
        conditional: seed.conditional,
      },
    });
    return NextResponse.json({ template });
  } catch (error) {
    return apiError(error);
  }
}

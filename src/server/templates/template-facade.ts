import { prisma } from "@/server/db";
import { writeAudit } from "@/server/audit";
import { storePrivateFile } from "@/server/storage/s3";
import {
  DEFAULT_TEMPLATE_CSS,
  renderPayslipHtml,
  renderPayslipHtmlFromTemplate,
  samplePayslipRenderData,
  type PayslipRenderData,
} from "@/server/payroll/payslip-template";

export class TemplateFacade {
  async listTemplates(companyId: string) {
    return prisma.companyTemplate.findMany({
      where: { companyId },
      orderBy: { version: "desc" },
    });
  }

  async getActiveTemplate(companyId: string) {
    return prisma.companyTemplate.findFirst({
      where: { companyId, isActive: true },
      orderBy: { version: "desc" },
    });
  }

  async createTemplateVersion(input: {
    actorUserId: string;
    companyId: string;
    name: string;
    htmlBody: string;
    cssBody?: string;
    sourceFile?: { buffer: Buffer; mimeType: string; originalName: string };
  }) {
    const htmlBody = input.htmlBody.trim();
    if (!htmlBody) throw new Error("Template HTML body is required");
    if (htmlBody.length > 1_000_000) throw new Error("Template HTML exceeds 1MB limit");
    if ((input.cssBody?.length ?? 0) > 200_000) throw new Error("Template CSS exceeds 200KB limit");
    if (input.sourceFile && input.sourceFile.buffer.length > 1_000_000) {
      throw new Error("Template file exceeds 1MB limit");
    }

    let sourceDocKey: string | undefined;
    if (input.sourceFile) {
      const stored = await storePrivateFile({
        buffer: input.sourceFile.buffer,
        mimeType: input.sourceFile.mimeType || "text/html",
        originalName: input.sourceFile.originalName,
        prefix: `templates/${input.companyId}`,
      });
      sourceDocKey = stored.storageKey;
    }

    const template = await prisma.$transaction(async (tx) => {
      await tx.companyTemplate.updateMany({
        where: { companyId: input.companyId, isActive: true },
        data: { isActive: false },
      });
      const max = await tx.companyTemplate.aggregate({
        where: { companyId: input.companyId },
        _max: { version: true },
      });
      const version = (max._max.version ?? 0) + 1;
      return tx.companyTemplate.create({
        data: {
          companyId: input.companyId,
          name: input.name.trim() || `Payslip template v${version}`,
          version,
          htmlBody,
          cssBody: input.cssBody?.trim() || DEFAULT_TEMPLATE_CSS,
          sourceDocKey,
          isActive: true,
        },
      });
    });

    await writeAudit({
      actorUserId: input.actorUserId,
      companyId: input.companyId,
      action: "template.create_version",
      entityType: "CompanyTemplate",
      entityId: template.id,
      metadata: { version: template.version, name: template.name },
    });

    return template;
  }

  async previewTemplateHtml(input: {
    htmlBody?: string | null;
    cssBody?: string | null;
    sampleData?: Partial<PayslipRenderData>;
  }) {
    const data = samplePayslipRenderData(input.sampleData);
    const htmlBody = input.htmlBody?.trim();
    if (!htmlBody) {
      return { html: renderPayslipHtml(data), sample: true as const };
    }
    return {
      html: renderPayslipHtmlFromTemplate(htmlBody, input.cssBody, data),
      sample: true as const,
    };
  }
}

export const templateFacade = new TemplateFacade();

import { templateFacade } from "@/server/facades/template-facade";
import { DataRow, StatusBadge, EmptyState, BracketLabel } from "@/components/industrial";
import { t } from "@/i18n";
import { TemplateUploadForm } from "@/app/admin/templates/template-upload-form";

export default async function CompanyTemplatesPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const templates = await templateFacade.listTemplates(companyId);

  return (
    <div>
      <div className="mb-8">
        <BracketLabel>{t("en", "admin.uploadTemplate")}</BracketLabel>
        <div className="mt-3">
          <TemplateUploadForm companyId={companyId} />
        </div>
      </div>
      <BracketLabel>{t("en", "admin.templateVersions")}</BracketLabel>
      <div className="mt-3 grid gap-3">
        {templates.map((tpl) => (
          <DataRow
            key={tpl.id}
            title={tpl.name}
            subtitle={`${t("en", "admin.version")} ${tpl.version} · ${t("en", "admin.templateNote")}`}
            action={
              <StatusBadge
                status={tpl.isActive ? t("en", "admin.active") : t("en", "admin.inactive")}
                tone={tpl.isActive ? "success" : "neutral"}
              />
            }
          />
        ))}
        {!templates.length ? (
          <EmptyState
            title={t("en", "admin.noTemplates")}
            description={t("en", "admin.noTemplatesBody")}
          />
        ) : null}
      </div>
    </div>
  );
}

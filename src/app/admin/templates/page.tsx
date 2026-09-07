import { requirePageUser } from "@/server/auth/page-guard";
import { AdminShell } from "@/components/admin-shell";
import { companyFacade } from "@/server/facades/company-facade";
import { templateFacade } from "@/server/facades/template-facade";
import { CompanyTabs, DataRow, StatusBadge, EmptyState, BracketLabel } from "@/components/industrial";
import { t } from "@/i18n";
import { TemplateUploadForm } from "./template-upload-form";

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string }>;
}) {
  const user = await requirePageUser(["SUPER_ADMIN", "OPERATIONS_MANAGER"]);
  const sp = await searchParams;
  const companies = await companyFacade.listCompanies();
  const companyId = sp.companyId ?? companies[0]?.id;
  const templates = companyId ? await templateFacade.listTemplates(companyId) : [];

  return (
    <AdminShell
      title={t("en", "admin.templates")}
      description={t("en", "admin.templatesDescription")}
      userName={user.email ?? user.phone}
      userRole={user.globalRole}
    >
      <CompanyTabs
        companies={companies}
        activeId={companyId}
        hrefFor={(id) => `/admin/templates?companyId=${id}`}
      />
      {companyId ? (
        <div className="mb-8">
          <BracketLabel>{t("en", "admin.uploadTemplate")}</BracketLabel>
          <div className="mt-3">
            <TemplateUploadForm companyId={companyId} />
          </div>
        </div>
      ) : null}
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
    </AdminShell>
  );
}

import { requirePageUser } from "@/server/auth/page-guard";
import { companyFacade } from "@/server/facades/company-facade";
import { AdminShell } from "@/components/admin-shell";
import { Card } from "@/components/ui";
import { Meta } from "@/components/industrial";
import { t } from "@/i18n";

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  await requirePageUser(["SUPER_ADMIN", "OPERATIONS_MANAGER"]);
  const { companyId } = await params;
  const company = await companyFacade.getCompany(companyId);
  return (
    <AdminShell title={company.name} kicker="REGISTRY / DETAIL">
      <Card>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="meta text-[var(--muted)]">{t("en", "admin.prefix")}</dt>
            <dd className="h-display text-2xl">{company.prefix}</dd>
          </div>
          <div>
            <dt className="meta text-[var(--muted)]">{t("en", "admin.gstin")}</dt>
            <dd>{company.gstin ?? t("en", "common.needsConfig")}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="meta text-[var(--muted)]">{t("en", "admin.address")}</dt>
            <dd className="normal-case tracking-[0.04em]">
              {company.address ?? t("en", "common.needsConfig")}
            </dd>
          </div>
          <div>
            <Meta>
              {company.isActive ? t("en", "admin.active") : t("en", "admin.inactive")}
            </Meta>
          </div>
        </dl>
      </Card>
    </AdminShell>
  );
}

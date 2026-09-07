import { requirePageUser } from "@/server/auth/page-guard";
import { companyFacade } from "@/server/facades/company-facade";
import { AdminShell } from "@/components/admin-shell";
import { Card } from "@/components/ui";
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
    <AdminShell title={company.name}>
      <Card>
        <div className="grid gap-2 text-sm">
          <div>
            <strong>Prefix:</strong> {company.prefix}
          </div>
          <div>
            <strong>GSTIN:</strong> {company.gstin ?? t("en", "common.needsConfig")}
          </div>
          <div>
            <strong>Address:</strong> {company.address ?? t("en", "common.needsConfig")}
          </div>
          <div>
            <strong>Active:</strong> {company.isActive ? "yes" : "no"}
          </div>
        </div>
      </Card>
    </AdminShell>
  );
}

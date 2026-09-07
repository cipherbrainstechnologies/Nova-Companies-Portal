import { companyFacade } from "@/server/facades/company-facade";
import { AlertBanner } from "@/components/industrial";
import { t } from "@/i18n";
import { ProfitForm } from "@/app/admin/finance/profit-form";

export default async function CompanyFinancePage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const companies = await companyFacade.listCompanies();

  return (
    <div>
      <AlertBanner tone="info">{t("en", "admin.financeFormula")}</AlertBanner>
      <div className="mt-6">
        <ProfitForm
          companies={companies.map((c) => ({ id: c.id, name: c.name }))}
          initialCompanyId={companyId}
          lockCompanyId
        />
      </div>
    </div>
  );
}

import { requirePageUser } from "@/server/auth/page-guard";
import { AdminShell } from "@/components/admin-shell";
import { companyFacade } from "@/server/facades/company-facade";
import { AlertBanner } from "@/components/industrial";
import { t } from "@/i18n";
import { ProfitForm } from "./profit-form";

export default async function FinancePage() {
  const user = await requirePageUser(["SUPER_ADMIN", "OPERATIONS_MANAGER"]);
  const companies = await companyFacade.listCompanies();
  return (
    <AdminShell
      title={t("en", "admin.finance")}
      description="Earned operating profit and cash remaining are computed separately. Bank balance is never labelled as profit."
      userName={user.email ?? user.phone}
      userRole={user.globalRole}
    >
      <AlertBanner tone="info">{t("en", "admin.financeFormula")}</AlertBanner>
      <div className="mt-6">
        <ProfitForm companies={companies.map((c) => ({ id: c.id, name: c.name }))} />
      </div>
    </AdminShell>
  );
}

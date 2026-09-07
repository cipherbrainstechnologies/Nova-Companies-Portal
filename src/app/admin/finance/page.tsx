import { requirePageUser } from "@/server/auth/page-guard";
import { AdminShell } from "@/components/admin-shell";
import { companyFacade } from "@/server/facades/company-facade";
import { Card } from "@/components/ui";
import { t } from "@/i18n";
import { ProfitForm } from "./profit-form";

export default async function FinancePage() {
  await requirePageUser(["SUPER_ADMIN", "OPERATIONS_MANAGER"]);
  const companies = await companyFacade.listCompanies();
  return (
    <AdminShell title={t("en", "admin.finance")}>
      <Card>
        <p className="text-sm">
          Reporting formula: <strong>Revenue − business expenses = earned operating profit</strong>.
          Then <strong>earned operating profit − owner/financing/personal outgoings = cash remaining</strong>.
          Bank balance is never labeled as profit.
        </p>
      </Card>
      <div className="mt-6">
        <ProfitForm companies={companies.map((c) => ({ id: c.id, name: c.name }))} />
      </div>
    </AdminShell>
  );
}

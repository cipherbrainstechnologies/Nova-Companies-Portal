import { requirePageUser } from "@/server/auth/page-guard";
import { AdminShell } from "@/components/admin-shell";
import { companyFacade } from "@/server/facades/company-facade";
import { Card } from "@/components/ui";
import { Meta } from "@/components/industrial";
import { t } from "@/i18n";
import { ProfitForm } from "./profit-form";

export default async function FinancePage() {
  await requirePageUser(["SUPER_ADMIN", "OPERATIONS_MANAGER"]);
  const companies = await companyFacade.listCompanies();
  return (
    <AdminShell title={t("en", "admin.finance")} kicker="FINANCE / PROFIT">
      <Card className="bg-[var(--bg-alt)]">
        <Meta className="normal-case tracking-[0.04em] text-[var(--muted)]">
          {t("en", "admin.financeFormula")}
        </Meta>
      </Card>
      <div className="mt-6">
        <ProfitForm companies={companies.map((c) => ({ id: c.id, name: c.name }))} />
      </div>
    </AdminShell>
  );
}

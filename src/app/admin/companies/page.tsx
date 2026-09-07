import Link from "next/link";
import { requirePageUser } from "@/server/auth/page-guard";
import { AdminShell } from "@/components/admin-shell";
import { companyFacade } from "@/server/facades/company-facade";
import { DataRow, BracketLabel } from "@/components/industrial";
import { t } from "@/i18n";
import { CreateCompanyForm } from "./create-form";

export default async function CompaniesPage() {
  const user = await requirePageUser(["SUPER_ADMIN", "OPERATIONS_MANAGER"]);
  const companies = await companyFacade.listCompanies();

  return (
    <AdminShell title={t("en", "admin.companies")} kicker="REGISTRY / ORG">
      <div className="grid gap-3">
        {companies.map((c) => (
          <DataRow
            key={c.id}
            title={c.name}
            subtitle={`Prefix ${c.prefix} · GSTIN ${c.gstin ?? t("en", "common.needsConfig")}`}
            action={
              <Link href={`/admin/companies/${c.id}`} className="meta text-[var(--accent)]">
                &gt;&gt;&gt; {t("en", "admin.open")}
              </Link>
            }
          />
        ))}
      </div>
      {user.globalRole === "SUPER_ADMIN" ? (
        <div className="mt-8">
          <BracketLabel>{t("en", "admin.addCompany")}</BracketLabel>
          <div className="mt-3">
            <CreateCompanyForm />
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}

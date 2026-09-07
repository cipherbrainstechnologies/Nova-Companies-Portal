import Link from "next/link";
import { requirePageUser } from "@/server/auth/page-guard";
import { AdminShell } from "@/components/admin-shell";
import { companyFacade } from "@/server/facades/company-facade";
import { Card } from "@/components/ui";
import { t } from "@/i18n";
import { CreateCompanyForm } from "./create-form";

export default async function CompaniesPage() {
  const user = await requirePageUser(["SUPER_ADMIN", "OPERATIONS_MANAGER"]);
  const companies = await companyFacade.listCompanies();

  return (
    <AdminShell title={t("en", "admin.companies")}>
      <div className="grid gap-4">
        {companies.map((c) => (
          <Card key={c.id}>
            <Link href={`/admin/companies/${c.id}`} className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{c.name}</div>
                <div className="text-sm text-[var(--muted)]">
                  Prefix {c.prefix} · GSTIN {c.gstin ?? t("en", "common.needsConfig")}
                </div>
              </div>
              <span className="text-sm text-[var(--accent)]">Open</span>
            </Link>
          </Card>
        ))}
      </div>
      {user.globalRole === "SUPER_ADMIN" ? (
        <div className="mt-8">
          <h2 className="h-display mb-3 text-xl font-bold">Add company</h2>
          <CreateCompanyForm />
        </div>
      ) : null}
    </AdminShell>
  );
}

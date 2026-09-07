import { requirePageUser } from "@/server/auth/page-guard";
import { companyFacade } from "@/server/facades/company-facade";
import { AdminShell } from "@/components/admin-shell";
import { CompanyHub } from "@/components/company-hub";
import { t } from "@/i18n";
import { notFound } from "next/navigation";

export default async function CompanyWorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ companyId: string }>;
}) {
  const user = await requirePageUser(["SUPER_ADMIN", "OPERATIONS_MANAGER"]);
  const { companyId } = await params;
  let company;
  try {
    company = await companyFacade.getCompany(companyId);
  } catch {
    notFound();
  }
  const companies = await companyFacade.listCompanies();

  return (
    <AdminShell
      title={company.name}
      description={t("en", "company.hub.workspace")}
      userName={user.email ?? user.phone}
      userRole={user.globalRole}
    >
      <CompanyHub
        companyId={company.id}
        companyName={company.name}
        companies={companies.map((c) => ({
          id: c.id,
          name: c.name,
          prefix: c.prefix,
        }))}
      >
        {children}
      </CompanyHub>
    </AdminShell>
  );
}

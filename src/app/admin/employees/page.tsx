import { requirePageUser } from "@/server/auth/page-guard";
import { AdminShell } from "@/components/admin-shell";
import { companyFacade } from "@/server/facades/company-facade";
import { employeeFacade } from "@/server/facades/employee-facade";
import { CompanyTabs, BracketLabel, DataRow } from "@/components/industrial";
import { t } from "@/i18n";
import { CreateEmployeeForm } from "./create-form";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string }>;
}) {
  await requirePageUser(["SUPER_ADMIN", "OPERATIONS_MANAGER"]);
  const sp = await searchParams;
  const companies = await companyFacade.listCompanies();
  const companyId = sp.companyId ?? companies[0]?.id;
  const employees = companyId ? await employeeFacade.listByCompany(companyId) : [];

  return (
    <AdminShell title={t("en", "admin.employees")} kicker="PERSONNEL / ROSTER">
      <CompanyTabs
        companies={companies}
        activeId={companyId}
        hrefFor={(id) => `/admin/employees?companyId=${id}`}
      />
      <div className="grid gap-3">
        {employees.map((e) => (
          <DataRow
            key={e.id}
            title={`${e.employeeCode} — ${e.firstName} ${e.lastName}`}
            subtitle={`${e.designation ?? "—"} · ${e.status} · ${e.contact?.primaryPhone ?? ""}`}
          />
        ))}
      </div>
      {companyId ? (
        <div className="mt-8">
          <BracketLabel>{t("en", "admin.addEmployee")}</BracketLabel>
          <div className="mt-3">
            <CreateEmployeeForm companyId={companyId} />
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}

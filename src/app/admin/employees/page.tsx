import { requirePageUser } from "@/server/auth/page-guard";
import { AdminShell } from "@/components/admin-shell";
import { companyFacade } from "@/server/facades/company-facade";
import { employeeFacade } from "@/server/facades/employee-facade";
import { CompanyTabs, BracketLabel } from "@/components/industrial";
import { t } from "@/i18n";
import Link from "next/link";
import { CreateEmployeeForm } from "./create-form";
import { EmployeeRosterTable } from "./employee-roster-table";
import { ModalTriggerCreateEmployee } from "./create-employee-modal";
import { ImportCsvModal } from "./import-csv-modal";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string }>;
}) {
  const user = await requirePageUser(["SUPER_ADMIN", "OPERATIONS_MANAGER"]);
  const sp = await searchParams;
  const companies = await companyFacade.listCompanies();
  const companyId = sp.companyId ?? companies[0]?.id;
  const employees = companyId ? await employeeFacade.listByCompany(companyId) : [];
  const companyName = companies.find((c) => c.id === companyId)?.name ?? "";

  const rows = employees.map((e) => ({
    id: e.id,
    companyId: e.companyId,
    companyName,
    employeeCode: e.employeeCode,
    firstName: e.firstName,
    lastName: e.lastName,
    displayName: e.displayName,
    status: e.status,
    email: e.contact?.officialEmail ?? e.contact?.personalEmail ?? "",
    phone: e.contact?.primaryPhone ?? "",
  }));

  return (
    <AdminShell
      title={t("en", "admin.employees")}
      description="Searchable employee roster by company. Open a profile for salary structure, hikes, and payslip folders."
      userName={user.email ?? user.phone}
      userRole={user.globalRole}
      actions={
        companyId ? (
          <>
            <ImportCsvModal
              companyId={companyId}
              employees={employees.map((employee) => ({
                id: employee.id,
                employeeCode: employee.employeeCode,
                name: employee.displayName ?? `${employee.firstName} ${employee.lastName}`,
              }))}
            />
            <ModalTriggerCreateEmployee companyId={companyId} />
          </>
        ) : undefined
      }
    >
      <CompanyTabs
        companies={companies}
        activeId={companyId}
        hrefFor={(id) => `/admin/employees?companyId=${id}`}
      />
      {companyId ? (
        <div className="mb-4">
          <Link
            href={`/admin/companies/${companyId}/employees`}
            className="text-sm font-semibold text-[var(--nova-teal)] hover:underline"
          >
            {t("en", "company.hub.openWorkspace")} →
          </Link>
        </div>
      ) : null}

      <EmployeeRosterTable rows={rows} companyId={companyId} canEdit />

      {companyId ? (
        <div className="mt-8 lg:hidden">
          <BracketLabel>{t("en", "admin.addEmployee")}</BracketLabel>
          <div className="mt-3">
            <CreateEmployeeForm companyId={companyId} />
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}

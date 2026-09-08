import { employeeFacade } from "@/server/facades/employee-facade";
import { companyFacade } from "@/server/facades/company-facade";
import { BracketLabel } from "@/components/industrial";
import { t } from "@/i18n";
import { CreateEmployeeForm } from "@/app/admin/employees/create-form";
import { EmployeeRosterTable } from "@/app/admin/employees/employee-roster-table";
import { ModalTriggerCreateEmployee } from "@/app/admin/employees/create-employee-modal";

export default async function CompanyEmployeesPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const [employees, company] = await Promise.all([
    employeeFacade.listByCompany(companyId),
    companyFacade.getCompany(companyId),
  ]);

  const rows = employees.map((e) => ({
    id: e.id,
    companyId: e.companyId,
    companyName: company.name,
    employeeCode: e.employeeCode,
    firstName: e.firstName,
    lastName: e.lastName,
    status: e.status,
    email: e.contact?.officialEmail ?? e.contact?.personalEmail ?? "",
    phone: e.contact?.primaryPhone ?? "",
  }));

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <ModalTriggerCreateEmployee companyId={companyId} />
      </div>
      <EmployeeRosterTable rows={rows} />
      <div className="mt-8 lg:hidden">
        <BracketLabel>{t("en", "admin.addEmployee")}</BracketLabel>
        <div className="mt-3">
          <CreateEmployeeForm companyId={companyId} />
        </div>
      </div>
    </div>
  );
}

import { requirePageUser } from "@/server/auth/page-guard";
import { AdminShell } from "@/components/admin-shell";
import { companyFacade } from "@/server/facades/company-facade";
import { employeeFacade } from "@/server/facades/employee-facade";
import { CompanyTabs, BracketLabel, DataRow, StatusBadge, EmptyState } from "@/components/industrial";
import { t } from "@/i18n";
import { CreateEmployeeForm } from "./create-form";

function initials(first: string, last: string) {
  return `${first.slice(0, 1)}${last.slice(0, 1)}`.toUpperCase();
}

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

  return (
    <AdminShell
      title={t("en", "admin.employees")}
      description="Searchable employee roster by company. Add employees with a temporary password for first login."
      userName={user.email ?? user.phone}
      userRole={user.globalRole}
    >
      <CompanyTabs
        companies={companies}
        activeId={companyId}
        hrefFor={(id) => `/admin/employees?companyId=${id}`}
      />
      {employees.length ? (
        <div className="grid gap-3">
          {employees.map((e) => {
            const blocked = e.status === "BLOCKED";
            return (
              <DataRow
                key={e.id}
                leading={
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      blocked
                        ? "bg-[var(--nova-surface-muted)] text-[var(--nova-muted)]"
                        : "bg-[var(--nova-teal-soft)] text-[var(--nova-teal)]"
                    }`}
                  >
                    {initials(e.firstName, e.lastName)}
                  </div>
                }
                title={`${e.firstName} ${e.lastName}`}
                subtitle={`${e.employeeCode} · ${e.designation ?? "—"} · ${e.contact?.primaryPhone ?? ""} · ${e.contact?.officialEmail ?? ""}`}
                action={
                  <StatusBadge
                    status={e.status}
                    tone={blocked ? "neutral" : e.status === "ACTIVE" ? "success" : "warning"}
                  />
                }
              />
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="No employees in this company"
          description="Create an employee record to allocate an ID and enable the employee portal."
        />
      )}
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

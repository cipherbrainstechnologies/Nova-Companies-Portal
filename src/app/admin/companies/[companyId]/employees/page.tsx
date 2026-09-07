import Link from "next/link";
import { employeeFacade } from "@/server/facades/employee-facade";
import { BracketLabel, DataRow, StatusBadge, EmptyState } from "@/components/industrial";
import { t } from "@/i18n";
import { CreateEmployeeForm } from "@/app/admin/employees/create-form";

function initials(first: string, last: string) {
  return `${first.slice(0, 1)}${last.slice(0, 1)}`.toUpperCase();
}

export default async function CompanyEmployeesPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const employees = await employeeFacade.listByCompany(companyId);

  return (
    <div>
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
                title={
                  <Link
                    href={`/admin/companies/${companyId}/employees/${e.id}`}
                    className="text-[var(--nova-teal)] hover:underline"
                  >
                    {e.firstName} {e.lastName}
                  </Link>
                }
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
          title={t("en", "company.hub.noEmployees")}
          description={t("en", "company.hub.noEmployeesBody")}
        />
      )}
      <div className="mt-8">
        <BracketLabel>{t("en", "admin.addEmployee")}</BracketLabel>
        <div className="mt-3">
          <CreateEmployeeForm companyId={companyId} />
        </div>
      </div>
    </div>
  );
}

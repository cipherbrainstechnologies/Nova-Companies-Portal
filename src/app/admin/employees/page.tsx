import { requirePageUser } from "@/server/auth/page-guard";
import { AdminShell } from "@/components/admin-shell";
import { companyFacade } from "@/server/facades/company-facade";
import { employeeFacade } from "@/server/facades/employee-facade";
import { Card } from "@/components/ui";
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
    <AdminShell title={t("en", "admin.employees")}>
      <div className="mb-4 flex flex-wrap gap-2">
        {companies.map((c) => (
          <a
            key={c.id}
            href={`/admin/employees?companyId=${c.id}`}
            className={`rounded-md px-3 py-1 text-sm ${
              c.id === companyId ? "bg-[var(--ink)] text-[var(--paper)]" : "bg-[var(--paper-soft)]"
            }`}
          >
            {c.name}
          </a>
        ))}
      </div>
      <div className="grid gap-3">
        {employees.map((e) => (
          <Card key={e.id}>
            <div className="font-semibold">
              {e.employeeCode} — {e.firstName} {e.lastName}
            </div>
            <div className="text-sm text-[var(--muted)]">
              {e.designation ?? "—"} · {e.status} · {e.contact?.primaryPhone}
            </div>
          </Card>
        ))}
      </div>
      {companyId ? (
        <div className="mt-8">
          <h2 className="h-display mb-3 text-xl font-bold">Add employee</h2>
          <CreateEmployeeForm companyId={companyId} />
        </div>
      ) : null}
    </AdminShell>
  );
}

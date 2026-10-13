import Link from "next/link";
import { Card } from "@/components/ui";
import { MoneyValue, StatCell } from "@/components/industrial";
import { requireClientPage } from "@/server/auth/client-page-guard";
import { getClientOverview } from "@/server/client/client-queries";

export default async function ClientOverviewPage({
  params,
}: {
  params: Promise<{ clientSlug: string }>;
}) {
  const { clientSlug } = await params;
  const { membership } = await requireClientPage(clientSlug);
  const overview = await getClientOverview({
    clientOrganizationId: membership.clientOrganizationId,
    portalRole: membership.portalRole,
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Dashboard</h2>
          <p className="text-sm text-[var(--nova-muted)]">
            Period {overview.periodMonth}/{overview.periodYear}. Employment cost is estimated until Nova issues the invoice.
          </p>
        </div>
        <Link
          href={`/client/${clientSlug}/team/new`}
          className="inline-flex min-h-11 items-center rounded-full bg-[#5857F5] px-4 text-sm font-semibold text-white hover:bg-[#4846DF]"
        >
          Add employee
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCell label="Active employees" value={String(overview.activeEmployees)} />
        <StatCell label="Onboarding in progress" value={String(overview.pendingOnboarding)} />
        <StatCell label="Pending actions" value={String(overview.openApprovals)} />
        <StatCell label="Payroll submission" value={overview.payrollStatus.replace(/_/g, " ")} />
        <StatCell
          label="Estimated employment cost"
          value={<MoneyValue value={overview.forecastTotal} />}
        />
        <StatCell
          label="Approved EOR service fee"
          value={
            overview.serviceFee == null
              ? "Not approved"
              : `${overview.serviceFeeCurrency ?? ""} ${overview.serviceFee.toLocaleString("en-IN")}`
          }
        />
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="font-semibold">Needs attention</h3>
          {overview.tasks.length ? (
            <ul className="mt-3 space-y-2 text-sm">
              {overview.tasks.map((task) => (
                <li key={task.id} className="flex items-center justify-between gap-3 border-b border-[var(--nova-border)] py-2">
                  <span>{task.title}</span>
                  <span className="text-[var(--nova-muted)]">{task.taskType.replace(/_/g, " ")}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-[var(--nova-muted)]">No open approvals.</p>
          )}
          <Link href={`/client/${clientSlug}/approvals`} className="mt-4 inline-flex text-sm font-semibold text-[#0C0C32] underline">
            Review approvals
          </Link>
        </Card>
        <Card className="p-4">
          <h3 className="font-semibold">Employees</h3>
          {overview.employees.length ? (
            <ul className="mt-3 space-y-2 text-sm">
              {overview.employees.map((employee) => (
                <li key={employee.id} className="border-b border-[var(--nova-border)] py-2">
                  <Link href={`/client/${clientSlug}/team/${employee.id}`} className="font-medium text-[#0C0C32]">
                    {employee.name}
                  </Link>
                  <p className="text-[var(--nova-muted)]">
                    {employee.designation ?? "Role not recorded"} · {employee.legalEmployer} · {employee.status}
                    {employee.startDate ? ` · ${employee.startDate}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-[var(--nova-muted)]">No employees are assigned to this organisation yet.</p>
          )}
          <Link href={`/client/${clientSlug}/team`} className="mt-4 inline-flex text-sm font-semibold text-[#0C0C32] underline">
            View employees
          </Link>
        </Card>
      </section>
    </div>
  );
}

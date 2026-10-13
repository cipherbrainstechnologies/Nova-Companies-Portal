import Link from "next/link";
import { requireClientPage } from "@/server/auth/client-page-guard";
import { prisma } from "@/server/db";
import { requireClientCapability } from "@/server/client/client-authz";
import { requireSessionUser } from "@/server/auth/session";
import { Card } from "@/components/ui";
import { StatusBadge } from "@/components/industrial";

export default async function ClientTeamPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientSlug: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { clientSlug } = await params;
  const query = await searchParams;
  const q = query.q?.trim() ?? "";
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = 25;
  const user = await requireSessionUser();
  const membership = await requireClientCapability({
    user,
    clientSlug,
    module: "team",
    action: "VIEW",
  });

  const where = {
    clientOrganizationId: membership.clientOrganizationId,
    ...(q
      ? {
          employee: {
            OR: [
              { firstName: { contains: q, mode: "insensitive" as const } },
              { lastName: { contains: q, mode: "insensitive" as const } },
              { displayName: { contains: q, mode: "insensitive" as const } },
              { designation: { contains: q, mode: "insensitive" as const } },
              { department: { contains: q, mode: "insensitive" as const } },
            ],
          },
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.employmentAssignment.findMany({
      where,
      include: { employee: { include: { company: true } } },
      orderBy: { effectiveFrom: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.employmentAssignment.count({ where }),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Employees</h2>
          <p className="text-sm text-[var(--nova-muted)]">{total} assigned</p>
        </div>
        <Link
          href={`/client/${clientSlug}/team/new`}
          className="inline-flex min-h-11 items-center rounded-full bg-[#5857F5] px-4 text-sm font-semibold text-white hover:bg-[#4846DF]"
        >
          Add employee
        </Link>
      </div>
      <form className="flex flex-col gap-2 sm:flex-row" action={`/client/${clientSlug}/team`}>
        <label htmlFor="employee-search" className="sr-only">Search employees</label>
        <input
          id="employee-search"
          name="q"
          defaultValue={q}
          placeholder="Search name, role, or department"
          className="min-h-11 w-full rounded-[var(--nova-radius-sm)] border border-[var(--nova-border-strong)] px-3 text-sm sm:max-w-sm"
        />
        <button type="submit" className="min-h-11 rounded-full border border-[#e5e7ef] px-4 text-sm font-semibold">
          Search
        </button>
      </form>
      {!rows.length ? (
        <p className="text-sm text-[var(--nova-muted)] md:hidden">No employees assigned yet. Submit a hire request to get started.</p>
      ) : null}
      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <Card key={row.id} className="p-4">
            <p className="font-semibold">{row.employee.displayName ?? `${row.employee.firstName} ${row.employee.lastName}`}</p>
            <p className="mt-1 text-sm text-[var(--nova-muted)]">
              {row.employee.designation ?? "Role not recorded"} · {row.employee.department ?? "No department"}
            </p>
            <p className="mt-1 text-sm">{row.employee.company.name} · {row.status}</p>
            <Link className="mt-3 inline-flex font-medium text-[#0C0C32] underline" href={`/client/${clientSlug}/team/${row.employeeId}`}>
              View
            </Link>
          </Card>
        ))}
      </div>
      <Card className="hidden overflow-hidden p-0 md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--nova-surface-muted)] text-xs uppercase tracking-wide text-[var(--nova-muted)]">
            <tr>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Job title</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Legal employer</th>
              <th className="px-4 py-3">Joining</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-[var(--nova-border)]">
                <td className="px-4 py-3 font-medium">
                  {row.employee.displayName ?? `${row.employee.firstName} ${row.employee.lastName}`}
                </td>
                <td className="px-4 py-3">{row.employee.designation ?? "—"}</td>
                <td className="px-4 py-3">{row.employee.department ?? "—"}</td>
                <td className="px-4 py-3">{row.employee.company.name}</td>
                <td className="px-4 py-3">{row.employee.dateOfJoining ? row.employee.dateOfJoining.toISOString().slice(0, 10) : "—"}</td>
                <td className="px-4 py-3">
                  <StatusBadge
                    status={row.status}
                    tone={row.status === "ACTIVE" ? "success" : "neutral"}
                  />
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    className="font-medium text-[var(--nova-teal)]"
                    href={`/client/${clientSlug}/team/${row.employeeId}`}
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[var(--nova-muted)]">
                  No employees assigned yet. Submit a hire request to get started.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>
      {total > pageSize ? (
        <p className="text-sm text-[var(--nova-muted)]">
          Page {page} of {Math.ceil(total / pageSize)}
        </p>
      ) : null}
    </div>
  );
}

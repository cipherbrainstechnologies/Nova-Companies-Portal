import Link from "next/link";
import { requireClientPage } from "@/server/auth/client-page-guard";
import { prisma } from "@/server/db";
import { requireClientCapability } from "@/server/client/client-authz";
import { requireSessionUser } from "@/server/auth/session";
import { Card } from "@/components/ui";
import { StatusBadge } from "@/components/industrial";

export default async function ClientTeamPage({
  params,
}: {
  params: Promise<{ clientSlug: string }>;
}) {
  const { clientSlug } = await params;
  const user = await requireSessionUser();
  const membership = await requireClientCapability({
    user,
    clientSlug,
    module: "team",
    action: "VIEW",
  });

  const rows = await prisma.employmentAssignment.findMany({
    where: { clientOrganizationId: membership.clientOrganizationId },
    include: {
      employee: { include: { company: true } },
    },
    orderBy: { effectiveFrom: "desc" },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">Employees</h2>
        <Link
          href={`/client/${clientSlug}/team/new`}
          className="inline-flex min-h-10 items-center rounded-[var(--nova-radius-sm)] bg-[var(--nova-teal)] px-4 text-sm font-semibold text-white"
        >
          Add employee
        </Link>
      </div>
      <Card className="overflow-hidden p-0">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--nova-surface-muted)] text-xs uppercase tracking-wide text-[var(--nova-muted)]">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Employer</th>
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
                <td className="px-4 py-3">{row.employee.company.name}</td>
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
                <td colSpan={4} className="px-4 py-8 text-center text-[var(--nova-muted)]">
                  No employees assigned yet. Submit a hire request to get started.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

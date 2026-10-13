import Link from "next/link";
import { requirePageUser } from "@/server/auth/page-guard";
import { AdminShell } from "@/components/admin-shell";
import { EmptyState, StatusBadge } from "@/components/industrial";
import {
  buildBusinessOverview,
  listWorkforce,
  parseBusinessFilters,
  planLabel,
} from "@/server/admin/business-metrics";
import { loadBusinessSnapshot, reportingPeriod } from "@/server/admin/load-business-snapshot";

export default async function WorkforcePage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; country?: string; entity?: string; plan?: string; kind?: string }>;
}) {
  await requirePageUser(["SUPER_ADMIN", "OPERATIONS_MANAGER"]);
  const search = await searchParams;
  const period = reportingPeriod(search);
  const filters = parseBusinessFilters(search);
  const snapshot = await loadBusinessSnapshot({ ...period });
  const overview = buildBusinessOverview(snapshot, filters);
  const kind = search.kind === "CLIENT" || search.kind === "FUTURE" || search.kind === "PENDING" || search.kind === "ON_HOLD" || search.kind === "UNASSIGNED" ? search.kind : "ALL";
  const rows = listWorkforce(snapshot, filters).filter((row) => kind === "ALL" || row.kind === kind);
  const visible = rows.slice(0, 200);

  return (
    <AdminShell
      title="Workforce"
      kicker="Employees"
      description="Client-assigned people are separated from employees who still need a classification. Absence of an assignment is not treated as Nova employment."
      actions={
        <Link href="/admin/employees" className="text-sm font-semibold text-[var(--nova-teal)]">
          Open roster
        </Link>
      }
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Count label="Billable client employees" value={overview.counts.billableEmployees} />
        <Count label="Needs classification" value={overview.counts.unclassifiedEmployees} />
        <Count label="Showing" value={`${visible.length} of ${rows.length}`} />
      </div>
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        {(["ALL", "CLIENT", "FUTURE", "PENDING", "ON_HOLD", "UNASSIGNED"] as const).map((value) => (
          <Link
            key={value}
            href={workforceHref(search, period, value)}
            className={
              kind === value
                ? "rounded-full bg-[var(--nova-teal)] px-3 py-1.5 font-semibold text-white"
                : "rounded-full border border-[var(--nova-border)] px-3 py-1.5"
            }
          >
            {value === "ALL" ? "All" : value === "ON_HOLD" ? "On hold" : value === "UNASSIGNED" ? "Needs classification" : value[0] + value.slice(1).toLowerCase()}
          </Link>
        ))}
      </div>
      {visible.length ? (
        <div className="overflow-x-auto rounded-[var(--nova-radius)] border border-[var(--nova-border)]">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-[var(--nova-surface-muted)] text-xs uppercase text-[var(--nova-muted)]">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Kind</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Legal employer</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={`${row.employeeId}-${row.clientId ?? row.kind}`} className="border-t border-[var(--nova-border)]">
                  <td className="px-4 py-3">
                    <Link href={row.href} className="font-medium text-[var(--nova-teal)]">{row.name}</Link>
                    <div className="text-xs text-[var(--nova-muted)]">{row.employeeCode}</div>
                  </td>
                  <td className="px-4 py-3">{row.kind.replace("_", " ")}</td>
                  <td className="px-4 py-3">
                    {row.clientId ? <Link href={`/admin/clients/${row.clientId}`}>{row.clientName}</Link> : "—"}
                  </td>
                  <td className="px-4 py-3">{row.novaCompanyName}</td>
                  <td className="px-4 py-3">{row.plan ? planLabel(row.plan) : "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.assignmentStatus ?? row.status} tone="info" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="No people in this view" description="Active client assignments and Nova employees without a client assignment are listed here." />
      )}
    </AdminShell>
  );
}

function Count({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-[var(--nova-radius)] border border-[var(--nova-border)] bg-[var(--nova-surface)] p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--nova-muted)]">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

function workforceHref(
  search: { country?: string; entity?: string; plan?: string },
  period: { year: number; month: number },
  kind: string,
) {
  const params = new URLSearchParams();
  if (kind !== "ALL") params.set("kind", kind);
  if (search.country) params.set("country", search.country);
  if (search.entity) params.set("entity", search.entity);
  if (search.plan) params.set("plan", search.plan);
  params.set("year", String(period.year));
  params.set("month", String(period.month));
  return `/admin/workforce?${params.toString()}`;
}

import Link from "next/link";
import { requirePageUser } from "@/server/auth/page-guard";
import { AdminShell } from "@/components/admin-shell";
import { DataRow, EmptyState, StatusBadge } from "@/components/industrial";
import { buildBusinessOverview, parseBusinessFilters, type ActionItem } from "@/server/admin/business-metrics";
import { loadBusinessSnapshot, reportingPeriod } from "@/server/admin/load-business-snapshot";

const KINDS: Array<ActionItem["kind"] | "all"> = [
  "all",
  "invoice",
  "funding",
  "agreement",
  "kyb",
  "onboarding",
  "renewal",
  "hire",
  "data-quality",
];

export default async function AdminTasksPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; country?: string; entity?: string; plan?: string; kind?: string }>;
}) {
  await requirePageUser(["SUPER_ADMIN", "OPERATIONS_MANAGER"]);
  const search = await searchParams;
  const period = reportingPeriod(search);
  const snapshot = await loadBusinessSnapshot({ ...period });
  const overview = buildBusinessOverview(snapshot, parseBusinessFilters(search));
  const kind = KINDS.includes(search.kind as ActionItem["kind"]) ? (search.kind as ActionItem["kind"]) : "all";
  const items = overview.actions.filter((item) => kind === "all" || item.kind === kind);

  return (
    <AdminShell
      title="Operations"
      kicker="Exceptions"
      description="P0 is a payroll-funding deadline that has passed. Collection and renewal items follow. Owners come from the client relationship owner."
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {KINDS.map((value) => {
          const params = new URLSearchParams();
          if (value !== "all") params.set("kind", value);
          if (search.country) params.set("country", search.country);
          if (search.entity) params.set("entity", search.entity);
          if (search.plan) params.set("plan", search.plan);
          params.set("year", String(period.year));
          params.set("month", String(period.month));
          const active = kind === value;
          return (
            <Link
              key={value}
              href={`/admin/tasks?${params.toString()}`}
              className={
                active
                  ? "rounded-full bg-[var(--nova-teal)] px-3 py-1.5 text-sm font-semibold text-white"
                  : "rounded-full border border-[var(--nova-border)] px-3 py-1.5 text-sm font-medium text-[var(--nova-text-secondary)]"
              }
            >
              {value.replace("-", " ")}
            </Link>
          );
        })}
      </div>
      {items.length ? (
        <div className="grid gap-2">
          {items.map((item) => (
            <DataRow
              key={item.id}
              title={item.title}
              subtitle={`${item.priority} · ${item.owner}${item.dueAt ? ` · due ${item.dueAt.slice(0, 10)}` : ""} · ${item.detail}`}
              action={
                <div className="flex items-center gap-2">
                  <StatusBadge status={item.status.replaceAll("_", " ")} tone={item.severity === "high" ? "danger" : "info"} />
                  <Link href={item.href} className="text-sm font-medium text-[var(--nova-teal)]">
                    Open
                  </Link>
                </div>
              }
            />
          ))}
        </div>
      ) : (
        <EmptyState title="No open items" description="This filter has no invoices, reviews, renewals, or onboarding blockers." />
      )}
    </AdminShell>
  );
}

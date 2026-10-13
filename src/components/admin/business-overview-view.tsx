import Link from "next/link";
import { StatCell, DataRow, StatusBadge, AlertBanner, EmptyState } from "@/components/industrial";
import { Button } from "@/components/ui";
import {
  METRIC_DEFINITIONS,
  formatMoneyList,
  planLabel,
  type BusinessOverview,
  type PlanCode,
} from "@/server/admin/business-metrics";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function BusinessOverviewView({
  overview,
  companies,
  countries,
  payroll,
}: {
  overview: BusinessOverview;
  companies: Array<{ id: string; name: string; prefix: string }>;
  countries: string[];
  payroll?: React.ReactNode;
}) {
  const asOfLabel = new Intl.DateTimeFormat("en-IN", {
    timeZone: overview.timezone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(overview.asOf));
  const maxPipeline = Math.max(1, ...overview.pipeline.map((stage) => stage.count));
  const preview = overview.actions.slice(0, 8);
  const query = filterQuery(overview);

  return (
    <div className="space-y-8">
      <form method="get" className="flex flex-wrap items-end gap-2">
        <Field label="Month">
          <select name="month" defaultValue={String(overview.period.month)} className={selectClass}>
            {MONTHS.map((label, index) => (
              <option key={label} value={index + 1}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Year">
          <select name="year" defaultValue={String(overview.period.year)} className={selectClass}>
            {[overview.period.year - 1, overview.period.year, overview.period.year + 1].map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Country">
          <select name="country" defaultValue={overview.filters.countryCode ?? ""} className={selectClass}>
            <option value="">All</option>
            {countries.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Nova entity">
          <select name="entity" defaultValue={overview.filters.novaCompanyId ?? ""} className={selectClass}>
            <option value="">All</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.prefix} · {company.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Plan">
          <select name="plan" defaultValue={overview.filters.plan ?? ""} className={selectClass}>
            <option value="">All</option>
            {(["ESSENTIAL", "MANAGED", "CUSTOM", "UNCONTRACTED"] as PlanCode[]).map((plan) => (
              <option key={plan} value={plan}>
                {planLabel(plan)}
              </option>
            ))}
          </select>
        </Field>
        <Button type="submit" size="sm">
          Apply
        </Button>
        <Link href="/admin/dashboard" className="text-sm font-medium text-[var(--nova-teal)]">
          Clear
        </Link>
      </form>

      <p className="text-xs text-[var(--nova-muted)]">
        Data as of {asOfLabel} ({overview.timezone}). Figures are calculated from client, assignment, pricing, and invoice records. Salary reimbursements are not shown as service revenue.
      </p>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Link href="/admin/clients" className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--nova-teal)]"><StatCell label="Active clients" value={overview.counts.activeClients} hint={`${overview.counts.clientsCreatedThisMonth} created this month`} /></Link>
        <StatCell label="Clients onboarding" value={overview.counts.onboardingClients} alert={overview.counts.onboardingClients > 0} hint="Not yet active" />
        <Link href={`/admin/workforce${query}`} className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--nova-teal)]"><StatCell label="Active client employees" value={overview.counts.activeClientEmployees} hint={`${overview.counts.clientEmployeesJoinedThisMonth} joined · ${overview.counts.clientEmployeesExitedThisMonth} exited`} /></Link>
        <StatCell
          label="Nova internal employees"
          value={overview.counts.novaInternalEmployees ?? "—"}
          hint={overview.counts.novaInternalEmployees == null ? "Hidden for this client filter" : "No active client assignment"}
        />
        <StatCell label="EOR MRR" value={formatMoneyList(overview.eorMrr, "No contracted fee")} hint={overview.counts.uncontractedActiveEmployees ? `${overview.counts.uncontractedActiveEmployees} active employees have no fee` : "Contracted service fees only"} />
        <StatCell label="Monthly billings" value={formatMoneyList(overview.monthlyBillings)} hint="Posted invoices, all charge types" />
        <StatCell label="EOR service revenue" value={formatMoneyList(overview.monthlyServiceRevenue)} hint="Platform-fee lines this month" />
        <Link href="/admin/tasks?kind=invoice" className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--nova-teal)]">
          <StatCell
            label="Outstanding receivables"
            value={formatMoneyList(overview.outstandingReceivables)}
            alert={overview.receivablesRequiringAction > 0}
            hint={overview.receivablesRequiringAction ? `${overview.receivablesRequiringAction} need action` : "No overdue or due-soon balances"}
          />
        </Link>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCell label="Employment reimbursements" value={formatMoneyList(overview.monthlyEmploymentReimbursements)} hint="Not Nova service revenue" />
        <StatCell label="Other invoiced charges" value={formatMoneyList(overview.monthlyOtherCharges)} hint="Lines that are neither fees nor reimbursements" />
        <StatCell label="Open payroll funding" value={formatMoneyList(overview.openPayrollFunding)} hint="Requests not marked settled" />
        <Link href="/admin/tasks?kind=renewal" className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--nova-teal)]">
          <StatCell
            label="Renewals within 90 days"
            value={overview.renewals.within90}
            alert={overview.renewals.within30 > 0}
            hint={`${overview.renewals.within30} within 30 days · ${overview.renewals.within60} within 60`}
          />
        </Link>
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <Unavailable title="Gross contribution" reason={overview.grossContribution.reason} />
        <Unavailable title="Payroll funding coverage" reason={overview.payrollFundingCoverage.reason} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-sm font-semibold text-[var(--nova-ink)]">Client pipeline</h2>
          <div className="grid gap-3">
            {overview.pipeline.map((stage) => (
              <Bar key={stage.stage} label={stage.stage} value={stage.count} max={maxPipeline} />
            ))}
          </div>
        </section>
        <section>
          <h2 className="mb-3 text-sm font-semibold text-[var(--nova-ink)]">Employees by plan</h2>
          {overview.planMix.every((row) => row.employees === 0 && row.clients === 0) ? (
            <EmptyState title="No active plan mix" description="Active clients with an effective pricing agreement will appear here." />
          ) : (
            <div className="grid gap-3">
              {overview.planMix.map((row) => (
                <Link key={row.plan} href={`/admin/workforce?plan=${row.plan}${overview.filters.novaCompanyId ? `&entity=${overview.filters.novaCompanyId}` : ""}`}>
                  <Bar
                    label={`${planLabel(row.plan)} · ${row.clients} clients`}
                    value={row.employees}
                    max={Math.max(1, ...overview.planMix.map((item) => item.employees))}
                    hint={formatMoneyList(row.mrr, "No contracted fee")}
                  />
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-sm font-semibold text-[var(--nova-ink)]">EOR MRR by country</h2>
          {overview.revenueByCountry.length ? (
            <div className="grid gap-2">
              {overview.revenueByCountry.map((row) => (
                <DataRow
                  key={row.countryCode}
                  title={row.countryCode}
                  subtitle="Contracted service fees"
                  action={<span className="text-sm font-semibold tabular-nums">{formatMoneyList(row.mrr)}</span>}
                />
              ))}
            </div>
          ) : (
            <EmptyState title="No contracted fees" description="MRR appears when an active client has an effective pricing agreement and active employees." />
          )}
        </section>
        <section>
          <h2 className="mb-3 text-sm font-semibold text-[var(--nova-ink)]">EOR MRR by Nova entity</h2>
          {overview.revenueByEntity.length ? (
            <div className="grid gap-2">
              {overview.revenueByEntity.map((row) => (
                <DataRow
                  key={row.novaCompanyId}
                  title={row.name}
                  subtitle="Allocated by employment assignment"
                  action={<span className="text-sm font-semibold tabular-nums">{formatMoneyList(row.mrr)}</span>}
                />
              ))}
            </div>
          ) : (
            <EmptyState title="No entity allocation" description="Active assignments on contracted clients will allocate MRR to the employing Nova entity." />
          )}
        </section>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-[var(--nova-ink)]">Receivable ageing</h2>
        <div className="grid gap-2">
          {overview.ageing.map((bucket) => (
            <DataRow
              key={bucket.bucket}
              title={bucket.bucket}
              subtitle={`${bucket.invoiceCount} invoice${bucket.invoiceCount === 1 ? "" : "s"}`}
              action={<span className="text-sm font-semibold tabular-nums">{formatMoneyList(bucket.amounts)}</span>}
            />
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-[var(--nova-ink)]">Clients by contracted fee</h2>
          <Link href="/admin/clients" className="text-sm font-medium text-[var(--nova-teal)]">All clients</Link>
        </div>
        {overview.topClients.length ? (
          <div className="overflow-x-auto rounded-[var(--nova-radius)] border border-[var(--nova-border)]">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-[var(--nova-surface-muted)] text-xs uppercase text-[var(--nova-muted)]">
                <tr>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Country</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Employees</th>
                  <th className="px-4 py-3">EOR MRR</th>
                </tr>
              </thead>
              <tbody>
                {overview.topClients.map((client) => (
                  <tr key={client.clientId} className="border-t border-[var(--nova-border)]">
                    <td className="px-4 py-3 font-medium">
                      <Link href={client.href} className="text-[var(--nova-teal)]">{client.legalName}</Link>
                    </td>
                    <td className="px-4 py-3">{client.countryCode}</td>
                    <td className="px-4 py-3">{planLabel(client.plan)}</td>
                    <td className="px-4 py-3 tabular-nums">{client.employees}</td>
                    <td className="px-4 py-3 tabular-nums">{formatMoneyList(client.mrr, "No contracted fee")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No active clients" description="Active organisations will appear here with fees taken from their pricing agreement." />
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-[var(--nova-ink)]">Needs attention</h2>
          <Link href={`/admin/tasks${query}`} className="text-sm font-medium text-[var(--nova-teal)]">
            {overview.actions.length} open
          </Link>
        </div>
        {preview.length ? (
          <div className="grid gap-2">
            {preview.map((item) => (
              <DataRow
                key={item.id}
                title={item.title}
                subtitle={`${item.owner} · ${item.detail}`}
                action={
                  <div className="flex items-center gap-2">
                    <StatusBadge status={item.severity} tone={item.severity === "high" ? "danger" : item.severity === "medium" ? "warning" : "info"} />
                    <Link href={item.href} className="text-sm font-medium text-[var(--nova-teal)]">Open</Link>
                  </div>
                }
              />
            ))}
          </div>
        ) : (
          <AlertBanner tone="success">Nothing in the action centre matches this filter.</AlertBanner>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-[var(--nova-ink)]">FX variance this month</h2>
        {overview.fxVariance.settlementCount === 0 ? (
          <EmptyState title="No FX settlements recorded" description="Quoted-versus-realised variance stays blank until an FXSettlement is stored. It is not shown as zero." />
        ) : (
          <AlertBanner tone={overview.fxVariance.incompleteCount ? "warning" : "info"}>
            {formatMoneyList(overview.fxVariance.amounts, "No variance amount recorded")} across {overview.fxVariance.settlementCount} settlement{overview.fxVariance.settlementCount === 1 ? "" : "s"}.
            {overview.fxVariance.incompleteCount ? ` ${overview.fxVariance.incompleteCount} settlement${overview.fxVariance.incompleteCount === 1 ? "" : "s"} have no variance amount.` : ""}
          </AlertBanner>
        )}
      </section>

      {payroll}

      <details className="rounded-[var(--nova-radius)] border border-[var(--nova-border)] bg-[var(--nova-surface)] px-4 py-3 text-sm">
        <summary className="cursor-pointer font-semibold text-[var(--nova-ink)]">Metric definitions</summary>
        <dl className="mt-3 grid gap-3">
          {METRIC_DEFINITIONS.map((item) => (
            <div key={item.name}>
              <dt className="font-medium text-[var(--nova-ink)]">{item.name}</dt>
              <dd className="text-[var(--nova-text-secondary)]">{item.definition}</dd>
            </div>
          ))}
        </dl>
      </details>
    </div>
  );
}

function filterQuery(overview: BusinessOverview) {
  const params = new URLSearchParams();
  if (overview.filters.countryCode) params.set("country", overview.filters.countryCode);
  if (overview.filters.novaCompanyId) params.set("entity", overview.filters.novaCompanyId);
  if (overview.filters.plan) params.set("plan", overview.filters.plan);
  params.set("year", String(overview.period.year));
  params.set("month", String(overview.period.month));
  const text = params.toString();
  return text ? `?${text}` : "";
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-xs font-semibold text-[var(--nova-muted)]">
      {label}
      {children}
    </label>
  );
}

const selectClass =
  "h-10 rounded-[var(--nova-radius-sm)] border border-[var(--nova-border)] bg-[var(--nova-surface)] px-2 text-sm text-[var(--nova-ink)]";

function Bar({ label, value, max, hint }: { label: string; value: number; max: number; hint?: string }) {
  const width = Math.max(0, Math.min(100, Math.round((value / max) * 100)));
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
        <span className="text-[var(--nova-ink)]">{label}</span>
        <span className="tabular-nums font-semibold">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-[var(--nova-surface-muted)]" role="img" aria-label={`${label}: ${value}`}>
        <div className="h-2 rounded-full bg-[var(--nova-teal)]" style={{ width: `${width}%` }} />
      </div>
      {hint ? <p className="mt-1 text-xs text-[var(--nova-muted)]">{hint}</p> : null}
    </div>
  );
}

function Unavailable({ title, reason }: { title: string; reason: string }) {
  return (
    <div className="rounded-[var(--nova-radius)] border border-dashed border-[var(--nova-border-strong)] bg-[var(--nova-surface)] p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--nova-muted)]">{title}</div>
      <div className="mt-2 text-lg font-semibold text-[var(--nova-ink)]">Unavailable</div>
      <p className="mt-1 text-xs text-[var(--nova-muted)]">{reason}</p>
    </div>
  );
}

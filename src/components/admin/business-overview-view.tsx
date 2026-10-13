import Link from "next/link";
import { DataRow, AlertBanner, EmptyState } from "@/components/industrial";
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
  const currencies = new Set(overview.serviceFeeTrend.flatMap((point) => point.amounts.map((amount) => amount.currency)));
  const comparable = currencies.size <= 1;
  const maxFee = comparable ? Math.max(1, ...overview.serviceFeeTrend.map((point) => Number(point.amounts[0]?.amount ?? 0))) : 1;
  const critical = overview.actions.filter((action) => action.priority === "P0" || action.priority === "P1");
  const queue = (critical.length ? critical : overview.actions).slice(0, 6);

  return (
    <div className="space-y-8">
      <form method="get" className="flex flex-wrap items-end gap-2">
        <Field label="Month">
          <select name="month" defaultValue={String(overview.period.month)} className={selectClass}>
            {MONTHS.map((label, index) => (
              <option key={label} value={index + 1}>{label}</option>
            ))}
          </select>
        </Field>
        <Field label="Year">
          <select name="year" defaultValue={String(overview.period.year)} className={selectClass}>
            {[overview.period.year - 1, overview.period.year, overview.period.year + 1].map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </Field>
        <Field label="Country">
          <select name="country" defaultValue={overview.filters.countryCode ?? ""} className={selectClass}>
            <option value="">All</option>
            {countries.map((country) => <option key={country} value={country}>{country}</option>)}
          </select>
        </Field>
        <Field label="Nova entity">
          <select name="entity" defaultValue={overview.filters.novaCompanyId ?? ""} className={selectClass}>
            <option value="">All</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>{company.prefix} · {company.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Plan">
          <select name="plan" defaultValue={overview.filters.plan ?? ""} className={selectClass}>
            <option value="">All</option>
            {(["ESSENTIAL", "MANAGED", "CUSTOM", "UNCONTRACTED"] as PlanCode[]).map((plan) => (
              <option key={plan} value={plan}>{planLabel(plan)}</option>
            ))}
          </select>
        </Field>
        <Button type="submit" size="sm">Apply</Button>
        <Link href="/admin/dashboard" className="text-sm font-medium text-[var(--nova-teal)]">Clear</Link>
      </form>

      <p className="text-xs text-[var(--nova-muted)]">
        {MONTHS[overview.period.month - 1]} {overview.period.year} · Asia/Kolkata · data as of {asOfLabel}. Contracted fees and invoiced service fees are labelled separately. Salary reimbursements are excluded from both.
      </p>

      <section aria-label="Business health">
        <h2 className="mb-3 text-sm font-semibold text-[var(--nova-ink)]">Business health</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Metric href="/admin/clients" label="Active clients" value={String(overview.counts.activeClients)} note={`${overview.counts.onboardingClients} still onboarding · ${overview.counts.clientsCreatedThisMonth} created this month`} />
          <Metric href="/admin/workforce" label="Billable employees" value={String(overview.counts.billableEmployees)} note={`${overview.counts.activeClientEmployees} active client assignments · ${overview.counts.uncontractedActiveEmployees} have no fee`} />
          <Metric label="Contracted EOR fees" value={formatMoneyList(overview.eorMrr, "No contracted fee")} note="Point-in-time run-rate from the effective pricing agreement. Not invoiced revenue." />
          <Metric href="/admin/finance/eor" label="Overdue receivables" value={formatMoneyList(overview.overdueReceivables, "None overdue")} note={overview.overdueInvoiceCount ? `${overview.overdueInvoiceCount} invoice${overview.overdueInvoiceCount === 1 ? "" : "s"} past due` : `Outstanding, not yet due: ${formatMoneyList(overview.outstandingReceivables)}`} attention={overview.overdueInvoiceCount > 0} />
          <Metric href="/admin/tasks?kind=funding" label="Payroll funding requested" value={formatMoneyList(overview.openPayrollFunding, "No open request")} note="A request is not cleared cash. Coverage is unavailable until payment reconciliation exists." attention={overview.openPayrollFunding.length > 0} />
          <Metric href="/admin/tasks" label="Critical exceptions" value={String(overview.criticalExceptions)} note={overview.criticalExceptions ? "Payroll funding is past its due date." : "No P0 funding exception in this filter."} attention={overview.criticalExceptions > 0} />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]" aria-label="Performance">
        <div>
          <h2 className="mb-1 text-sm font-semibold text-[var(--nova-ink)]">Invoiced EOR service fees</h2>
          <p className="mb-3 text-xs text-[var(--nova-muted)]">Invoice periods, platform-fee lines only. This is not recognised accounting revenue and does not include salary reimbursements. This month: {formatMoneyList(overview.monthlyServiceRevenue)}.</p>
          <div className="grid gap-2">
            {overview.serviceFeeTrend.map((point) => {
              const amount = comparable ? Number(point.amounts[0]?.amount ?? 0) : 0;
              const width = comparable && point.amounts.length ? Math.max(4, Math.round((amount / maxFee) * 100)) : point.amounts.length ? 100 : 0;
              return (
                <div key={`${point.year}-${point.month}`} className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-3 text-sm">
                  <span className="text-[var(--nova-muted)]">{MONTHS[point.month - 1]} {String(point.year).slice(2)}</span>
                  <div className="h-2 rounded-full bg-[var(--nova-surface-muted)]" role="img" aria-label={`${MONTHS[point.month - 1]} ${point.year}: ${formatMoneyList(point.amounts, "No service fee invoiced")}`}>
                    <div className="h-2 rounded-full bg-[var(--nova-ink)]" style={{ width: `${width}%` }} />
                  </div>
                  <span className="tabular-nums">{formatMoneyList(point.amounts, "—")}</span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-[var(--nova-muted)]">
            Employment reimbursements this month: {formatMoneyList(overview.monthlyEmploymentReimbursements)}. Posted billings, all charge types: {formatMoneyList(overview.monthlyBillings)}.
          </p>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold text-[var(--nova-ink)]">Workforce movement</h2>
          <DataRow title="Joined this month" subtitle="Client-assigned employees whose join date falls in the period" action={<span className="tabular-nums font-semibold">{overview.counts.clientEmployeesJoinedThisMonth}</span>} />
          <div className="mt-2">
            <DataRow title="Left this month" subtitle="Client-assigned employees whose exit date falls in the period" action={<span className="tabular-nums font-semibold">{overview.counts.clientEmployeesExitedThisMonth}</span>} />
          </div>
          <div className="mt-2">
            <DataRow title="Needs classification" subtitle="Active employees with no open or future client assignment. Not counted as Nova staff." action={<span className="tabular-nums font-semibold">{overview.counts.unclassifiedEmployees}</span>} />
          </div>
          <p className="mt-3 text-xs text-[var(--nova-muted)]">A historical headcount chart is not shown. Past months would require the client lifecycle at that date, which is not stored.</p>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-[var(--nova-ink)]">Where the contracted fees sit</h2>
        {overview.topClients.length ? (
          <div className="overflow-x-auto rounded-[var(--nova-radius)] border border-[var(--nova-border)]">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-[var(--nova-surface-muted)] text-xs uppercase text-[var(--nova-muted)]">
                <tr>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Billable people</th>
                  <th className="px-4 py-3">Contracted fee</th>
                </tr>
              </thead>
              <tbody>
                {overview.topClients.slice(0, 8).map((client) => (
                  <tr key={client.clientId} className="border-t border-[var(--nova-border)]">
                    <td className="px-4 py-3"><Link href={client.href} className="font-medium text-[var(--nova-teal)]">{client.legalName}</Link><div className="text-xs text-[var(--nova-muted)]">{client.countryCode}</div></td>
                    <td className="px-4 py-3">{planLabel(client.plan)}</td>
                    <td className="px-4 py-3 tabular-nums">{client.employees}</td>
                    <td className="px-4 py-3 tabular-nums">{formatMoneyList(client.mrr, "No contracted fee")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No active clients in this filter" description="Contracted fees appear when an active client has an effective pricing agreement and active employees." />
        )}
        <p className="mt-3 text-xs text-[var(--nova-muted)]">
          Plans: {overview.planMix.map((row) => `${planLabel(row.plan)} ${row.employees}`).join(" · ")}. Pipeline: {overview.pipeline.map((stage) => `${stage.stage} ${stage.count}`).join(" · ")}.
        </p>
      </section>

      <section aria-label="Action required">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-[var(--nova-ink)]">Action required</h2>
          <Link href="/admin/tasks" className="text-sm font-medium text-[var(--nova-teal)]">{overview.actions.length} open</Link>
        </div>
        {queue.length ? (
          <div className="grid gap-2">
            {queue.map((item) => (
              <DataRow
                key={item.id}
                title={item.title}
                subtitle={`${item.priority} · ${item.owner} · ${item.detail}`}
                action={<Link href={item.href} className="text-sm font-medium text-[var(--nova-teal)]">Open</Link>}
              />
            ))}
          </div>
        ) : (
          <AlertBanner tone="success">No open exception matches this filter.</AlertBanner>
        )}
      </section>

      <section aria-label="Exceptions">
        <h2 className="mb-3 text-sm font-semibold text-[var(--nova-ink)]">Exceptions from the records</h2>
        {overview.insights.length ? (
          <div className="grid gap-2">
            {overview.insights.slice(0, 6).map((insight) => (
              <DataRow key={insight.id} title={insight.title} subtitle={insight.detail} action={<Link href={insight.href} className="text-sm font-medium text-[var(--nova-teal)]">Review</Link>} />
            ))}
          </div>
        ) : (
          <EmptyState title="No material exception in this filter" description="The checks cover missing fees, single-currency concentration above 40%, overlapping assignments, and employees left off an invoice that already bills their colleagues." />
        )}
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        <Unavailable title="Gross contribution" reason={overview.grossContribution.reason} />
        <Unavailable title="Payroll funding coverage" reason={overview.payrollFundingCoverage.reason} />
        <Unavailable title="FX variance" reason={overview.fxVariance.reason} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-[var(--nova-ink)]">Receivable ageing</h2>
        <div className="grid gap-2 md:grid-cols-2">
          {overview.ageing.filter((bucket) => bucket.invoiceCount > 0).map((bucket) => (
            <DataRow key={bucket.bucket} title={bucket.bucket} subtitle={`${bucket.invoiceCount} invoice${bucket.invoiceCount === 1 ? "" : "s"}`} action={<span className="text-sm font-semibold tabular-nums">{formatMoneyList(bucket.amounts)}</span>} />
          ))}
          {overview.ageing.every((bucket) => bucket.invoiceCount === 0) ? (
            <EmptyState title="No open receivable" description="Posted invoices with a remaining balance will appear in these buckets." />
          ) : null}
        </div>
      </section>

      {payroll}

      <details className="rounded-[var(--nova-radius)] border border-[var(--nova-border)] px-4 py-3 text-sm">
        <summary className="cursor-pointer font-semibold">How these figures are calculated</summary>
        <dl className="mt-3 grid gap-3">
          {METRIC_DEFINITIONS.map((item) => (
            <div key={item.name}>
              <dt className="font-medium">{item.name}</dt>
              <dd className="text-[var(--nova-text-secondary)]">{item.definition}</dd>
            </div>
          ))}
        </dl>
      </details>
    </div>
  );
}

function Metric({
  label,
  value,
  note,
  href,
  attention,
}: {
  label: string;
  value: string;
  note: string;
  href?: string;
  attention?: boolean;
}) {
  const body = (
    <div className={`h-full rounded-[var(--nova-radius)] border bg-[var(--nova-surface)] p-4 ${attention ? "border-[var(--nova-danger)]/40" : "border-[var(--nova-border)]"}`}>
      <div className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--nova-muted)]">{label}</div>
      <div className={`mt-2 text-2xl font-bold tabular-nums ${attention ? "text-[var(--nova-danger)]" : "text-[var(--nova-ink)]"}`}>{value}</div>
      <p className="mt-2 text-xs text-[var(--nova-muted)]">{note}</p>
    </div>
  );
  return href ? <Link href={href} className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--nova-teal)]">{body}</Link> : body;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-1 text-xs font-semibold text-[var(--nova-muted)]">{label}{children}</label>;
}

const selectClass = "h-10 rounded-[var(--nova-radius-sm)] border border-[var(--nova-border)] bg-[var(--nova-surface)] px-2 text-sm text-[var(--nova-ink)]";

function Unavailable({ title, reason }: { title: string; reason: string }) {
  return (
    <div className="rounded-[var(--nova-radius)] border border-dashed border-[var(--nova-border-strong)] p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--nova-muted)]">{title}</div>
      <div className="mt-2 font-semibold">Unavailable</div>
      <p className="mt-1 text-xs text-[var(--nova-muted)]">{reason}</p>
    </div>
  );
}

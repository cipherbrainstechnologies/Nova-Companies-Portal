import Link from "next/link";
import { requirePageUser } from "@/server/auth/page-guard";
import { AdminShell } from "@/components/admin-shell";
import { DataRow, EmptyState } from "@/components/industrial";
import { Button } from "@/components/ui";
import {
  buildBusinessOverview,
  formatMoneyAmount,
  formatMoneyList,
  parseBusinessFilters,
} from "@/server/admin/business-metrics";
import { loadBusinessSnapshot, reportingPeriod } from "@/server/admin/load-business-snapshot";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default async function EorFinancePage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; country?: string; entity?: string; plan?: string }>;
}) {
  await requirePageUser(["SUPER_ADMIN", "OPERATIONS_MANAGER"]);
  const search = await searchParams;
  const period = reportingPeriod(search);
  const snapshot = await loadBusinessSnapshot(period);
  const overview = buildBusinessOverview(snapshot, parseBusinessFilters(search));
  const asOfLabel = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(snapshot.asOf));
  const financeActions = overview.actions.filter((action) => action.kind === "invoice" || action.kind === "funding" || action.kind === "data-quality");
  const visibleRows = overview.receivableRows.slice(0, 200);
  const countries = [...new Set(snapshot.clients.map((client) => client.countryCode))].sort();
  const fxRows = snapshot.fxSettlements.filter((row) => {
    const settled = new Date(row.settledAt);
    return settled >= new Date(snapshot.periodStart) && settled < new Date(snapshot.periodEnd);
  });

  return (
    <AdminShell
      title="Client receivables"
      kicker="Finance"
      description="Outstanding client invoices, ageing, and payroll funding requests. Bank-statement profit stays on Finance & profit. Invoice totals are not EOR service revenue."
      actions={
        <Link href="/admin/finance">
          <Button variant="outline" size="sm">Company profit</Button>
        </Link>
      }
    >
      <form method="get" className="mb-4 flex flex-wrap items-end gap-2">
        <label className="grid gap-1 text-xs font-semibold text-[var(--nova-muted)]">
          Month
          <select name="month" defaultValue={String(period.month)} className={selectClass}>
            {MONTHS.map((label, index) => <option key={label} value={index + 1}>{label}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-semibold text-[var(--nova-muted)]">
          Year
          <select name="year" defaultValue={String(period.year)} className={selectClass}>
            {[period.year - 1, period.year, period.year + 1].map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-semibold text-[var(--nova-muted)]">
          Country
          <select name="country" defaultValue={search.country ?? ""} className={selectClass}>
            <option value="">All</option>
            {countries.map((country) => <option key={country} value={country}>{country}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-semibold text-[var(--nova-muted)]">
          Nova entity
          <select name="entity" defaultValue={search.entity ?? ""} className={selectClass}>
            <option value="">All</option>
            {snapshot.companies.map((company) => <option key={company.id} value={company.id}>{company.prefix} · {company.name}</option>)}
          </select>
        </label>
        <Button type="submit" size="sm">Apply</Button>
      </form>
      <p className="mb-6 text-xs text-[var(--nova-muted)]">
        Reporting date {asOfLabel} (Asia/Kolkata). Balances use payments received and credit notes issued on or before that instant. Amounts stay in the invoice currency.
      </p>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Tile label="Total receivables" value={formatMoneyList(overview.outstandingReceivables)} note="Open posted balances" />
        <Tile label="Overdue" value={formatMoneyList(overview.overdueReceivables, "None overdue")} note={`${overview.overdueInvoiceCount} invoice${overview.overdueInvoiceCount === 1 ? "" : "s"} past the due date`} attention={overview.overdueInvoiceCount > 0} />
        <Tile label="Due within 7 days" value={formatMoneyList(overview.dueWithin7Receivables, "None due this week")} note="Includes invoices due today" />
        <Tile label="Payroll funding requested" value={formatMoneyList(overview.openPayrollFunding, "No open request")} note="Requests are not cleared cash" attention={overview.openPayrollFunding.length > 0} />
        <Tile label="Verified funding position" value="Unavailable" note={overview.payrollFundingCoverage.reason} />
        <Tile label="Finance exceptions" value={String(financeActions.length)} note="Overdue invoices, funding deadlines, overpayments, and invoice gaps" attention={financeActions.some((action) => action.priority === "P0")} />
      </section>

      <section className="mt-8" id="ageing">
        <h2 className="mb-3 text-sm font-semibold">Receivables ageing</h2>
        <div className="grid gap-2 md:grid-cols-2">
          {overview.ageing.filter((bucket) => bucket.invoiceCount > 0).map((bucket) => (
            <DataRow key={bucket.bucket} title={bucket.bucket} subtitle={`${bucket.invoiceCount} invoice${bucket.invoiceCount === 1 ? "" : "s"}`} action={<span className="tabular-nums text-sm font-semibold">{formatMoneyList(bucket.amounts)}</span>} />
          ))}
        </div>
        {overview.receivableRows.length === 0 ? <div className="mt-3"><EmptyState title="No open receivable" description="Posted invoices with a remaining balance as of this date will appear here." /></div> : null}
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold">Open invoices</h2>
          <p className="text-xs text-[var(--nova-muted)]">Showing {visibleRows.length} of {overview.receivableRows.length}. Totals above include every open invoice, not only this list.</p>
        </div>
        {visibleRows.length ? (
          <div className="overflow-x-auto rounded-[var(--nova-radius)] border border-[var(--nova-border)]">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="bg-[var(--nova-surface-muted)] text-xs uppercase text-[var(--nova-muted)]">
                <tr>
                  <th className="px-3 py-3">Client</th>
                  <th className="px-3 py-3">Invoice</th>
                  <th className="px-3 py-3">Due</th>
                  <th className="px-3 py-3">Gross</th>
                  <th className="px-3 py-3">Credits</th>
                  <th className="px-3 py-3">Received</th>
                  <th className="px-3 py-3">Outstanding</th>
                  <th className="px-3 py-3">Age</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr key={row.invoiceId} className="border-t border-[var(--nova-border)]">
                    <td className="px-3 py-3">
                      <Link href={row.href} className="font-medium text-[var(--nova-teal)]">{row.clientName}</Link>
                      <div className="text-xs text-[var(--nova-muted)]">{row.novaCompanyName} · {row.owner}</div>
                    </td>
                    <td className="px-3 py-3">{row.invoiceNumber}<div className="text-xs text-[var(--nova-muted)]">{row.status.replaceAll("_", " ")}</div></td>
                    <td className="px-3 py-3">{row.dueAt ? row.dueAt.slice(0, 10) : "No due date"}</td>
                    <td className="px-3 py-3 tabular-nums">{formatMoneyAmount({ currency: row.currency, amount: row.gross })}</td>
                    <td className="px-3 py-3 tabular-nums">{formatMoneyAmount({ currency: row.currency, amount: row.credits })}</td>
                    <td className="px-3 py-3 tabular-nums">{formatMoneyAmount({ currency: row.currency, amount: row.payments })}</td>
                    <td className="px-3 py-3 tabular-nums font-semibold">{formatMoneyAmount({ currency: row.currency, amount: row.outstanding })}</td>
                    <td className="px-3 py-3">{row.bucket}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold">Payroll funding requests</h2>
        <p className="mb-3 text-xs text-[var(--nova-muted)]">{overview.payrollFundingCoverage.reason}</p>
        {overview.fundingExposure.length ? (
          <div className="grid gap-2">
            {overview.fundingExposure.map((row) => (
              <DataRow
                key={row.id}
                title={`${row.clientName} · ${row.periodMonth}/${row.periodYear}`}
                subtitle={`${row.status}${row.dueAt ? ` · due ${row.dueAt.slice(0, 10)}` : " · no due date"}${row.overdue ? " · past due" : ""}`}
                action={<Link href={row.href} className="text-sm font-semibold tabular-nums text-[var(--nova-teal)]">{formatMoneyAmount({ currency: row.currency, amount: row.amount })}</Link>}
              />
            ))}
          </div>
        ) : (
          <EmptyState title="No open funding request" description="A request appears here until its status is marked settled. That status is not proof of cleared cash." />
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold">FX settlements this month</h2>
        {fxRows.length ? (
          <div className="grid gap-2">
            {fxRows.map((row) => {
              const client = snapshot.clients.find((item) => item.id === row.clientOrganizationId);
              return (
                <DataRow
                  key={row.id}
                  title={client?.legalName ?? "Client"}
                  subtitle={`Settled ${row.settledAt.slice(0, 10)} · INR received ${row.inrReceived == null ? "not on this row" : formatMoneyAmount({ currency: "INR", amount: row.inrReceived })} · variance unverified`}
                  action={<Link href={`/admin/clients/${row.clientOrganizationId}`} className="text-sm font-medium text-[var(--nova-teal)]">Client</Link>}
                />
              );
            })}
          </div>
        ) : (
          <EmptyState title="No FX settlement in this month" description={overview.fxVariance.reason} />
        )}
        {fxRows.length ? <p className="mt-2 text-xs text-[var(--nova-muted)]">{overview.fxVariance.reason}</p> : null}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold">Needs attention</h2>
        {financeActions.length ? (
          <div className="grid gap-2">
            {financeActions.slice(0, 12).map((action) => (
              <DataRow key={action.id} title={action.title} subtitle={`${action.priority} · ${action.owner} · ${action.detail}`} action={<Link href={action.href} className="text-sm font-medium text-[var(--nova-teal)]">Open</Link>} />
            ))}
          </div>
        ) : (
          <EmptyState title="No finance exception in this filter" description="Overdue invoices, funding deadlines, and overpayments will be listed here." />
        )}
      </section>
    </AdminShell>
  );
}

function Tile({ label, value, note, attention }: { label: string; value: string; note: string; attention?: boolean }) {
  return (
    <div className={`rounded-[var(--nova-radius)] border bg-[var(--nova-surface)] p-4 ${attention ? "border-[var(--nova-danger)]/40" : "border-[var(--nova-border)]"}`}>
      <div className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--nova-muted)]">{label}</div>
      <div className={`mt-2 text-2xl font-bold tabular-nums ${attention ? "text-[var(--nova-danger)]" : "text-[var(--nova-ink)]"}`}>{value}</div>
      <p className="mt-2 text-xs text-[var(--nova-muted)]">{note}</p>
    </div>
  );
}

const selectClass = "h-10 rounded-[var(--nova-radius-sm)] border border-[var(--nova-border)] bg-[var(--nova-surface)] px-2 text-sm";

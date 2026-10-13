import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageUser } from "@/server/auth/page-guard";
import { clientOrganizationFacade } from "@/server/facades/client-organization-facade";
import { canActivateClient } from "@/server/client/activation";
import { prisma } from "@/server/db";
import { AdminShell } from "@/components/admin-shell";
import { Card } from "@/components/ui";
import { AlertBanner, DataRow, StatusBadge } from "@/components/industrial";
import { buildBusinessOverview, formatMoneyList, planAt, planLabel } from "@/server/admin/business-metrics";
import { loadBusinessSnapshot, reportingPeriod } from "@/server/admin/load-business-snapshot";
import { ClientAdminActions } from "./client-admin-actions";
import { OnboardingWorkspace } from "./onboarding-workspace";

export default async function AdminClientDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  await requirePageUser(["SUPER_ADMIN", "OPERATIONS_MANAGER"]);
  const { clientId } = await params;
  const client = await clientOrganizationFacade.getClient(clientId);
  if (!client) notFound();
  const activation = await canActivateClient(clientId);
  const period = reportingPeriod({});
  const [companies, snapshot, activity] = await Promise.all([
    prisma.company.findMany({ orderBy: { prefix: "asc" } }),
    loadBusinessSnapshot(period),
    prisma.clientActivityAudit.findMany({
      where: { clientOrganizationId: clientId },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, action: true, createdAt: true },
    }),
  ]);
  const overview = buildBusinessOverview(snapshot, { clientId });
  const clientInvoices = snapshot.invoices.filter((invoice) => invoice.clientOrganizationId === clientId);
  const plan = planAt(
    snapshot.pricingAgreements.filter((agreement) => agreement.clientOrganizationId === clientId),
    new Date(snapshot.asOf),
  );
  const commercialDates = [
    ...snapshot.pricingAgreements.filter((agreement) => agreement.clientOrganizationId === clientId),
    ...snapshot.novaAgreements.filter((agreement) => agreement.clientOrganizationId === clientId),
  ];
  const nextRenewal = commercialDates
    .flatMap((agreement) => (agreement.effectiveTo ? [agreement.effectiveTo] : []))
    .filter((value) => new Date(value).getTime() >= new Date(snapshot.asOf).getTime())
    .sort()[0];
  const renewalLabel = commercialDates.length === 0
    ? "not recorded"
    : nextRenewal
      ? nextRenewal.slice(0, 10)
      : commercialDates.some((agreement) => agreement.effectiveTo == null)
        ? "open-ended"
        : "expired";

  return (
    <AdminShell
      title={client.legalName}
      kicker="Client organization"
      description={`${client.countryCode} · ${client.billingCurrency} billing · ${client.slug}`}
    >
      <nav className="mb-4 flex flex-wrap gap-3 text-sm font-medium text-[var(--nova-teal)]">
        <a href="#employees">Employees</a>
        <a href="#pricing">Pricing</a>
        <a href="#invoices">Invoices</a>
        <a href="#activity">Activity</a>
      </nav>
      <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--nova-muted)]">Status</p>
          <div className="mt-2"><StatusBadge status={client.lifecycleStatus} tone="info" /></div>
          <p className="mt-2 text-sm text-[var(--nova-text-secondary)]">{planLabel(plan)} · {client.proposedNovaCompany?.name ?? "Employer not assigned"} · Renewal {renewalLabel}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--nova-muted)]">Active employees</p>
          <p className="mt-2 text-2xl font-bold tabular-nums">{overview.counts.activeClientEmployees}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--nova-muted)]">Contracted EOR fee</p>
          <p className="mt-2 text-2xl font-bold tabular-nums">{formatMoneyList(overview.eorMrr, "No contracted fee")}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--nova-muted)]">Open actions</p>
          <p className="mt-2 text-2xl font-bold tabular-nums">{overview.actions.length}</p>
          <p className="mt-2 text-sm text-[var(--nova-text-secondary)]">Receivables {formatMoneyList(overview.outstandingReceivables)}</p>
        </Card>
      </section>
      <OnboardingWorkspace
        clientId={clientId}
        status={client.lifecycleStatus}
        reference={client.publicReference ?? client.slug}
        owner={client.relationshipOwnerId ?? "Unassigned"}
        documents={client.legalDocuments}
        blockers={activation.blockers.map((item) => item.message)}
        planNote={
          client.pricingAgreements[0]
            ? `Approved pricing v${client.pricingAgreements[0].version}`
            : "No approved pricing agreement"
        }
      />
      {!activation.ok ? (
        <div className="mb-4">
        <AlertBanner tone="warning">
          Activation blocked: {activation.blockers.map((b) => b.message).join("; ")}
        </AlertBanner>
        </div>
      ) : null}
      <div className="mt-6 grid gap-6">
        <section id="employees">
          <h2 className="mb-3 text-sm font-semibold">Employees</h2>
          {client.employmentAssignments.length ? (
            <div className="grid gap-2">
              {client.employmentAssignments.map((assignment) => (
                <DataRow
                  key={assignment.id}
                  title={`${assignment.employee.firstName} ${assignment.employee.lastName}`}
                  subtitle={`${assignment.employee.employeeCode} · ${assignment.status}`}
                  action={
                    <Link href={`/admin/companies/${assignment.novaCompanyId}/employees/${assignment.employeeId}`} className="text-sm font-medium text-[var(--nova-teal)]">
                      Profile
                    </Link>
                  }
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--nova-muted)]">No employment assignments.</p>
          )}
        </section>
        <section id="pricing">
          <h2 className="mb-3 text-sm font-semibold">Pricing agreements</h2>
          {client.pricingAgreements.length ? (
            <div className="grid gap-2">
              {client.pricingAgreements.map((agreement) => (
                <DataRow
                  key={agreement.id}
                  title={`Version ${agreement.version} · ${agreement.currency} ${agreement.feePerEmployee.toString()} per employee`}
                  subtitle={`From ${agreement.effectiveFrom.toISOString().slice(0, 10)}${agreement.effectiveTo ? ` to ${agreement.effectiveTo.toISOString().slice(0, 10)}` : " · open-ended"}`}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--nova-muted)]">No pricing agreement. Catalogue prices are not applied automatically.</p>
          )}
        </section>
        <section id="invoices">
          <h2 className="mb-3 text-sm font-semibold">Invoices</h2>
          {clientInvoices.length ? (
            <div className="grid gap-2">
              {clientInvoices.slice(0, 12).map((invoice) => (
                <DataRow
                  key={invoice.id}
                  title={invoice.invoiceNumber}
                  subtitle={`${invoice.periodMonth}/${invoice.periodYear} · ${invoice.financialState}`}
                  action={<span className="text-sm font-semibold tabular-nums">{formatMoneyList([{ currency: invoice.currency, amount: invoice.total }])}</span>}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--nova-muted)]">No posted or draft invoices.</p>
          )}
        </section>
        <section id="activity">
          <h2 className="mb-3 text-sm font-semibold">Recent activity</h2>
          {activity.length ? (
            <div className="grid gap-2">
              {activity.map((item) => (
                <DataRow key={item.id} title={item.action} subtitle={item.createdAt.toISOString().slice(0, 16).replace("T", " ")} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--nova-muted)]">No client activity recorded.</p>
          )}
        </section>
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="space-y-2 p-4">
          <h3 className="font-semibold">Lifecycle</h3>
          <p className="text-sm">Status: {client.lifecycleStatus}</p>
          <p className="text-sm">Risk: {client.riskRating ?? "—"}</p>
        </Card>
        <Card className="space-y-2 p-4">
          <h3 className="font-semibold">Assignments</h3>
          <p className="text-sm">{client.employmentAssignments.length} employment assignment(s)</p>
        </Card>
      </div>
      <ClientAdminActions clientId={clientId} companies={companies} client={client} />
    </AdminShell>
  );
}

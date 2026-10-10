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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Overview</h2>
        <p className="text-sm text-[var(--nova-muted)]">
          Period {overview.periodMonth}/{overview.periodYear} — figures may be estimated until invoiced.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCell label="Active employees" value={String(overview.activeEmployees)} />
        <StatCell label="Joining / in review" value={String(overview.pendingOnboarding)} />
        <StatCell label="Open approvals" value={String(overview.openApprovals)} />
        <StatCell
          label="Forecast employment cost"
          value={<MoneyValue value={overview.forecastTotal} />}
        />
      </div>
      <Card className="p-4">
        <h3 className="font-semibold">Next payroll</h3>
        <p className="mt-2 text-sm text-[var(--nova-text-secondary)]">
          Client submission status: <strong>{overview.payrollStatus}</strong>. Funding confirmation is
          required before NOVA issues statutory payroll.
        </p>
      </Card>
    </div>
  );
}

import { requireClientPage } from "@/server/auth/client-page-guard";
import { getClientVisibleEmployeeCosts } from "@/server/client/cost-visibility";
import { Card } from "@/components/ui";
import { MoneyValue } from "@/components/industrial";

export default async function ClientCostsPage({
  params,
}: {
  params: Promise<{ clientSlug: string }>;
}) {
  const { clientSlug } = await params;
  const { membership } = await requireClientPage(clientSlug);
  const now = new Date();
  const costs = await getClientVisibleEmployeeCosts({
    clientOrganizationId: membership.clientOrganizationId,
    portalRole: membership.portalRole,
    periodYear: now.getUTCFullYear(),
    periodMonth: now.getUTCMonth() + 1,
  });

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Costs</h2>
      <p className="text-sm text-[var(--nova-muted)]">
        Employer costs per assigned employee. Statutory lines use configured assumptions until frozen snapshots exist.
      </p>
      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-[var(--nova-surface-muted)] text-xs uppercase text-[var(--nova-muted)]">
            <tr>
              <th className="px-4 py-3 text-left">Employee</th>
              <th className="px-4 py-3 text-left">Gross</th>
              <th className="px-4 py-3 text-left">Statutory</th>
              <th className="px-4 py-3 text-left">EOR fee</th>
              <th className="px-4 py-3 text-left">Total</th>
            </tr>
          </thead>
          <tbody>
            {costs.map((row) => (
              <tr key={row.employeeId} className="border-t border-[var(--nova-border)]">
                <td className="px-4 py-3">{row.displayName}</td>
                <td className="px-4 py-3">{row.grossSalary ? <MoneyValue value={row.grossSalary} /> : "—"}</td>
                <td className="px-4 py-3">
                  {row.employerStatutory ? <MoneyValue value={row.employerStatutory} /> : "—"}
                </td>
                <td className="px-4 py-3">{row.eorServiceFee ? <MoneyValue value={row.eorServiceFee} /> : "—"}</td>
                <td className="px-4 py-3">
                  {row.totalEmployerCost ? <MoneyValue value={row.totalEmployerCost} /> : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

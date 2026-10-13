import Link from "next/link";
import { requirePageUser } from "@/server/auth/page-guard";
import { clientOrganizationFacade } from "@/server/facades/client-organization-facade";
import { prisma } from "@/server/db";
import { AdminShell } from "@/components/admin-shell";
import { Card } from "@/components/ui";
import { EmptyState, StatusBadge } from "@/components/industrial";
import { planAt, planLabel, type PlanCode } from "@/server/admin/business-metrics";
import { CreateClientForm } from "./create-client-form";

export default async function AdminClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string; plan?: string }>;
}) {
  await requirePageUser(["SUPER_ADMIN", "OPERATIONS_MANAGER"]);
  const search = await searchParams;
  const [clients, companies] = await Promise.all([
    clientOrganizationFacade.listClients(),
    prisma.company.findMany({ orderBy: { prefix: "asc" }, select: { id: true, name: true, prefix: true } }),
  ]);
  const country = search.country?.trim().toUpperCase();
  const planFilter = search.plan?.toUpperCase();
  const now = new Date();
  const rows = clients.filter((client) => {
    if (country && client.countryCode.toUpperCase() !== country) return false;
    if (planFilter) {
      const plan = planAt(
        client.pricingAgreements.map((agreement) => ({
          version: agreement.version,
          currency: agreement.currency,
          feePerEmployee: agreement.feePerEmployee.toString(),
          effectiveFrom: agreement.effectiveFrom.toISOString(),
          effectiveTo: agreement.effectiveTo?.toISOString() ?? null,
        })),
        now,
      );
      if (plan !== planFilter) return false;
    }
    return true;
  });

  return (
    <AdminShell title="Client organizations" description="Overseas customers. Open a client for the single operational record.">
      <div className="mb-6">
        <CreateClientForm companies={companies} />
      </div>
      <Card className="overflow-hidden p-0">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--nova-surface-muted)] text-xs uppercase text-[var(--nova-muted)]">
            <tr>
              <th className="px-4 py-3">Legal name</th>
              <th className="px-4 py-3">Country</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">NOVA entity</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Active staff</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const plan = planAt(
                c.pricingAgreements.map((agreement) => ({
                  version: agreement.version,
                  currency: agreement.currency,
                  feePerEmployee: agreement.feePerEmployee.toString(),
                  effectiveFrom: agreement.effectiveFrom.toISOString(),
                  effectiveTo: agreement.effectiveTo?.toISOString() ?? null,
                })),
                now,
              );
              return (
              <tr key={c.id} className="border-t border-[var(--nova-border)]">
                <td className="px-4 py-3 font-medium">{c.legalName}</td>
                <td className="px-4 py-3">{c.countryCode}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={c.lifecycleStatus} tone="info" />
                </td>
                <td className="px-4 py-3">{c.proposedNovaCompany?.prefix ?? "—"}</td>
                <td className="px-4 py-3">{planLabel(plan as PlanCode)}</td>
                <td className="px-4 py-3">{c.employmentAssignments.length}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/clients/${c.id}`} className="font-medium text-[var(--nova-teal)]">
                    Open
                  </Link>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
        {!rows.length ? (
          <div className="p-4">
            <EmptyState title="No clients match this filter" description="Clear the country or plan filter to see every organisation." />
          </div>
        ) : null}
      </Card>
    </AdminShell>
  );
}

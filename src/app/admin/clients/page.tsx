import Link from "next/link";
import { requirePageUser } from "@/server/auth/page-guard";
import { clientOrganizationFacade } from "@/server/facades/client-organization-facade";
import { AdminShell } from "@/components/admin-shell";
import { Card } from "@/components/ui";
import { StatusBadge } from "@/components/industrial";
import { CreateClientForm } from "./create-client-form";

export default async function AdminClientsPage() {
  await requirePageUser(["SUPER_ADMIN", "OPERATIONS_MANAGER"]);
  const clients = await clientOrganizationFacade.listClients();

  return (
    <AdminShell title="Client organizations" description="Overseas customers (not NOVA legal entities).">
      <div className="mb-6">
        <CreateClientForm />
      </div>
      <Card className="overflow-hidden p-0">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--nova-surface-muted)] text-xs uppercase text-[var(--nova-muted)]">
            <tr>
              <th className="px-4 py-3">Legal name</th>
              <th className="px-4 py-3">Country</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">NOVA entity</th>
              <th className="px-4 py-3">Active staff</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id} className="border-t border-[var(--nova-border)]">
                <td className="px-4 py-3 font-medium">{c.legalName}</td>
                <td className="px-4 py-3">{c.countryCode}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={c.lifecycleStatus} tone="info" />
                </td>
                <td className="px-4 py-3">{c.proposedNovaCompany?.prefix ?? "—"}</td>
                <td className="px-4 py-3">{c.employmentAssignments.length}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/clients/${c.id}`} className="font-medium text-[var(--nova-teal)]">
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </AdminShell>
  );
}

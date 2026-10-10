import { notFound } from "next/navigation";
import { requirePageUser } from "@/server/auth/page-guard";
import { clientOrganizationFacade } from "@/server/facades/client-organization-facade";
import { canActivateClient } from "@/server/client/activation";
import { prisma } from "@/server/db";
import { AdminShell } from "@/components/admin-shell";
import { Card } from "@/components/ui";
import { AlertBanner } from "@/components/industrial";
import { ClientAdminActions } from "./client-admin-actions";

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
  const companies = await prisma.company.findMany({ orderBy: { prefix: "asc" } });

  return (
    <AdminShell
      title={client.legalName}
      kicker="Client organization"
      description={`Slug: ${client.slug} · ${client.countryCode}`}
    >
      {!activation.ok ? (
        <div className="mb-4">
        <AlertBanner tone="warning">
          Activation blocked: {activation.blockers.map((b) => b.message).join("; ")}
        </AlertBanner>
        </div>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
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

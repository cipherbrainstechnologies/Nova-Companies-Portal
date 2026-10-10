import { requirePageUser } from "@/server/auth/page-guard";
import { AdminShell } from "@/components/admin-shell";
import { prisma } from "@/server/db";
import { Card } from "@/components/ui";
import { HireRequestActions } from "./hire-request-actions";

export default async function AdminHireRequestsPage() {
  await requirePageUser(["SUPER_ADMIN", "OPERATIONS_MANAGER"]);
  const requests = await prisma.hireRequest.findMany({
    where: { status: { in: ["SUBMITTED", "NOVA_REVIEW", "MORE_INFO", "OFFER_PENDING"] } },
    include: { clientOrganization: true },
    orderBy: { submittedAt: "desc" },
    take: 50,
  });

  return (
    <AdminShell title="Hire requests" description="Client-submitted candidates awaiting NOVA review.">
      <Card className="divide-y p-0">
        {requests.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium">{r.clientOrganization.legalName}</p>
              <p className="text-xs text-[var(--nova-muted)]">{r.status}</p>
            </div>
            <HireRequestActions requestId={r.id} />
          </div>
        ))}
        {!requests.length ? <p className="p-6 text-sm text-[var(--nova-muted)]">No pending hire requests.</p> : null}
      </Card>
    </AdminShell>
  );
}

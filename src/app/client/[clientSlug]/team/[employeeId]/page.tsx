import { notFound } from "next/navigation";
import { requireClientPage } from "@/server/auth/client-page-guard";
import { assertEmployeeInClientTenant } from "@/server/client/client-authz";
import { maskPan } from "@/server/client/cost-visibility";
import { prisma } from "@/server/db";
import { Card } from "@/components/ui";
import { StatusBadge } from "@/components/industrial";

export default async function ClientEmployeeProfilePage({
  params,
}: {
  params: Promise<{ clientSlug: string; employeeId: string }>;
}) {
  const { clientSlug, employeeId } = await params;
  const { membership } = await requireClientPage(clientSlug);
  await assertEmployeeInClientTenant(membership.clientOrganizationId, employeeId);

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { company: true, verificationChecks: true },
  });
  if (!employee) notFound();

  const showPan =
    membership.portalRole === "OWNER_ADMIN" || membership.portalRole === "HR_MANAGER";

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">
        {employee.displayName ?? `${employee.firstName} ${employee.lastName}`}
      </h2>
      <Card className="space-y-2 p-4">
        <p className="text-sm">Code: {employee.employeeCode}</p>
        <p className="text-sm">NOVA employer: {employee.company.name}</p>
        <StatusBadge status={employee.status} tone="info" />
        {showPan ? <p className="text-sm">PAN: {maskPan(employee.pan) ?? "Pending"}</p> : null}
      </Card>
      <Card className="p-4">
        <h3 className="font-semibold">Verification</h3>
        <ul className="mt-2 space-y-1 text-sm">
          {employee.verificationChecks.map((c) => (
            <li key={c.id}>{c.checkType}: {c.status}</li>
          ))}
          {!employee.verificationChecks.length ? <li>No checks recorded yet.</li> : null}
        </ul>
      </Card>
    </div>
  );
}

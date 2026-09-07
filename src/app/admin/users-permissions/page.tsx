import { requirePageUser } from "@/server/auth/page-guard";
import { AdminShell } from "@/components/admin-shell";
import { prisma } from "@/server/db";
import { DataRow, StatusBadge, EmptyState, AlertBanner } from "@/components/industrial";
import { t } from "@/i18n";

function summarizeGrants(
  grants: Array<{ company: { prefix: string; name: string }; module: string; action: string }>,
) {
  if (!grants.length) return "No company-scoped grants (role-wide access may still apply for Super Admin).";
  const byCompany = new Map<string, string[]>();
  for (const g of grants) {
    const key = g.company.prefix;
    const list = byCompany.get(key) ?? [];
    list.push(`${g.action} ${g.module}`);
    byCompany.set(key, list);
  }
  return Array.from(byCompany.entries())
    .map(([prefix, actions]) => `Can ${actions.join(", ")} for ${prefix}`)
    .join(". ");
}

export default async function UsersPermissionsPage() {
  const user = await requirePageUser(["SUPER_ADMIN"]);
  const users = await prisma.user.findMany({
    include: { permissionGrants: { include: { company: true } }, employee: true },
    orderBy: { createdAt: "desc" },
  });
  return (
    <AdminShell
      title={t("en", "admin.users")}
      description="Account roles and company-module grants. Use the summary line for a quick read of access."
      userName={user.email ?? user.phone}
      userRole={user.globalRole}
    >
      <div className="mb-4">
        <AlertBanner tone="info">
          Permissions are deny-by-default. Advanced grant editing remains API/admin-config driven in
          this release — this view presents a clear summary without an overwhelming matrix.
        </AlertBanner>
      </div>
      <div className="grid gap-3">
        {users.map((u) => (
          <DataRow
            key={u.id}
            title={u.email ?? u.phone}
            subtitle={summarizeGrants(u.permissionGrants)}
            action={
              <div className="flex flex-col items-end gap-1">
                <StatusBadge status={u.globalRole} tone="info" />
                <StatusBadge
                  status={u.isActive ? "Active" : "Inactive"}
                  tone={u.isActive ? "success" : "neutral"}
                />
              </div>
            }
          />
        ))}
        {!users.length ? <EmptyState title="No users" /> : null}
      </div>
    </AdminShell>
  );
}

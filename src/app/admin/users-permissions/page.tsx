import { requirePageUser } from "@/server/auth/page-guard";
import { AdminShell } from "@/components/admin-shell";
import { prisma } from "@/server/db";
import { Card } from "@/components/ui";
import { t } from "@/i18n";

export default async function UsersPermissionsPage() {
  await requirePageUser(["SUPER_ADMIN"]);
  const users = await prisma.user.findMany({
    include: { permissionGrants: { include: { company: true } }, employee: true },
    orderBy: { createdAt: "desc" },
  });
  return (
    <AdminShell title={t("en", "admin.users")}>
      <div className="grid gap-3">
        {users.map((u) => (
          <Card key={u.id}>
            <div className="font-semibold">
              {u.phone} · {u.globalRole}
            </div>
            <div className="text-sm text-[var(--muted)]">
              Grants:{" "}
              {u.permissionGrants.length
                ? u.permissionGrants
                    .map((g) => `${g.company.prefix}:${g.module}.${g.action}`)
                    .join(", ")
                : "none"}
            </div>
          </Card>
        ))}
      </div>
    </AdminShell>
  );
}

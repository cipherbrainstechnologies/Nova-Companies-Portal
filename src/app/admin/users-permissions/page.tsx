import { requirePageUser } from "@/server/auth/page-guard";
import { AdminShell } from "@/components/admin-shell";
import { prisma } from "@/server/db";
import { DataRow } from "@/components/industrial";
import { t } from "@/i18n";

export default async function UsersPermissionsPage() {
  await requirePageUser(["SUPER_ADMIN"]);
  const users = await prisma.user.findMany({
    include: { permissionGrants: { include: { company: true } }, employee: true },
    orderBy: { createdAt: "desc" },
  });
  return (
    <AdminShell title={t("en", "admin.users")} kicker="SECURITY / GRANTS">
      <div className="grid gap-3">
        {users.map((u) => (
          <DataRow
            key={u.id}
            title={`${u.phone} · ${u.globalRole}`}
            subtitle={`${t("en", "admin.grants")}: ${
              u.permissionGrants.length
                ? u.permissionGrants
                    .map((g) => `${g.company.prefix}:${g.module}.${g.action}`)
                    .join(", ")
                : t("en", "admin.none")
            }`}
          />
        ))}
      </div>
    </AdminShell>
  );
}

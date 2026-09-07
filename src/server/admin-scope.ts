import type { AppAction, AppModule } from "@prisma/client";
import { prisma } from "@/server/db";
import type { SessionUser } from "@/server/rbac/permissions";

export async function accessibleCompanyIds(user: SessionUser, module: AppModule, action: AppAction = "view") {
  if (user.globalRole === "SUPER_ADMIN") {
    return (await prisma.company.findMany({ select: { id: true } })).map((company) => company.id);
  }
  return (await prisma.permissionGrant.findMany({
    where: { userId: user.id, module, action },
    select: { companyId: true },
    distinct: ["companyId"],
  })).map((grant) => grant.companyId);
}

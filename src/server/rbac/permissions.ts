import type { AppAction, AppModule, GlobalRole } from "@prisma/client";
import { prisma } from "@/server/db";

export class AuthzError extends Error {
  status = 403;
  constructor(message = "Forbidden") {
    super(message);
    this.name = "AuthzError";
  }
}

export class AuthError extends Error {
  status = 401;
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "AuthError";
  }
}

export type SessionUser = {
  id: string;
  phone: string;
  email: string | null;
  globalRole: GlobalRole;
  mustChangePassword: boolean;
  employeeId: string | null;
  isActive: boolean;
};

export async function requirePermission(input: {
  user: SessionUser;
  companyId: string;
  module: AppModule;
  action: AppAction;
}): Promise<void> {
  if (!input.user.isActive) throw new AuthzError("Account inactive");
  if (input.user.globalRole === "SUPER_ADMIN") return;

  if (input.user.globalRole === "EMPLOYEE") {
    throw new AuthzError("Employees cannot access admin modules");
  }

  const grant = await prisma.permissionGrant.findUnique({
    where: {
      userId_companyId_module_action: {
        userId: input.user.id,
        companyId: input.companyId,
        module: input.module,
        action: input.action,
      },
    },
  });

  if (!grant) throw new AuthzError("Missing permission");
}

export async function requireEmployeeOwnsPayslip(input: {
  user: SessionUser;
  payslipEmployeeId: string;
}): Promise<void> {
  if (input.user.globalRole === "SUPER_ADMIN") return;
  if (input.user.globalRole === "EMPLOYEE") {
    if (!input.user.employeeId || input.user.employeeId !== input.payslipEmployeeId) {
      throw new AuthzError("Not your payslip");
    }
    return;
  }
  throw new AuthzError("Forbidden");
}

export function assertCompanyScope(resourceCompanyId: string, requestedCompanyId: string) {
  if (resourceCompanyId !== requestedCompanyId) {
    throw new AuthzError("Company scope mismatch");
  }
}

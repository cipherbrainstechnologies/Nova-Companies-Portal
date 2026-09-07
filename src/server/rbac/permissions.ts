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

/**
 * Named permissions used by the payroll automation surfaces. Deny-by-default still
 * applies: this map documents which module/action pair each route requires, it does not
 * grant anything.
 */
export const NAMED_PERMISSIONS = {
  salaryStructureView: { module: "salaryStructure", action: "view" },
  salaryStructureEdit: { module: "salaryStructure", action: "edit" },
  statementsUpload: { module: "statements", action: "create" },
  statementsReconcile: { module: "statements", action: "reconcile" },
  payrollApprove: { module: "payroll", action: "approve" },
  payrollIssue: { module: "payroll", action: "issue" },
  payslipsDownload: { module: "payslips", action: "download" },
  payslipsResendEmail: { module: "payslips", action: "resendEmail" },
  companiesEdit: { module: "companies", action: "edit" },
} as const satisfies Record<string, { module: AppModule; action: AppAction }>;

/**
 * Fallbacks for operators provisioned before a dedicated module existed. The primary
 * permission is always checked first.
 */
export const PERMISSION_FALLBACKS: Partial<
  Record<keyof typeof NAMED_PERMISSIONS, Array<{ module: AppModule; action: AppAction }>>
> = {
  salaryStructureView: [{ module: "employees", action: "view" }],
  salaryStructureEdit: [{ module: "employees", action: "edit" }],
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

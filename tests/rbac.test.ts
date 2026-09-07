import { describe, expect, it } from "vitest";
import { AuthzError, requirePermission, type SessionUser } from "../src/server/rbac/permissions";

describe("rbac deny-by-default", () => {
  it("blocks employees from admin modules", async () => {
    const user: SessionUser = {
      id: "u1",
      phone: "+919999000002",
      email: null,
      globalRole: "EMPLOYEE",
      mustChangePassword: false,
      employeeId: "e1",
      isActive: true,
    };
    await expect(
      requirePermission({
        user,
        companyId: "c1",
        module: "employees",
        action: "view",
      }),
    ).rejects.toBeInstanceOf(AuthzError);
  });

  it("allows super admin without grants", async () => {
    const user: SessionUser = {
      id: "u0",
      phone: "+919999000001",
      email: "admin@nova.local",
      globalRole: "SUPER_ADMIN",
      mustChangePassword: false,
      employeeId: null,
      isActive: true,
    };
    await expect(
      requirePermission({
        user,
        companyId: "any",
        module: "payroll",
        action: "issue",
      }),
    ).resolves.toBeUndefined();
  });
});

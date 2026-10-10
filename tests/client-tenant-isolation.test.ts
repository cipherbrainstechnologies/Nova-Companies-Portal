import { describe, expect, it } from "vitest";
import { roleHasCapability } from "../src/server/client/capability-matrix";
import { AuthzError } from "../src/server/rbac/permissions";

describe("client tenant isolation (logic)", () => {
  it("team manager cannot download invoices by default", () => {
    expect(roleHasCapability("TEAM_MANAGER", "invoices", "DOWNLOAD")).toBe(false);
  });

  it("finance cannot invite people by default", () => {
    expect(roleHasCapability("FINANCE", "people", "INVITE")).toBe(false);
  });

  it("authz errors are 403", () => {
    expect(new AuthzError().status).toBe(403);
  });
});

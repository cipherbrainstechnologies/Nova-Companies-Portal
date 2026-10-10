import { describe, expect, it } from "vitest";
import { roleHasCapability } from "../src/server/client/capability-matrix";
import { slugifyClientName } from "../src/server/client/slug";

describe("client capability matrix", () => {
  it("denies team managers from invoice download by default", () => {
    expect(roleHasCapability("TEAM_MANAGER", "invoices", "DOWNLOAD")).toBe(false);
  });

  it("allows finance to view costs", () => {
    expect(roleHasCapability("FINANCE", "costs", "VIEW")).toBe(true);
  });

  it("allows owner admin to invite people", () => {
    expect(roleHasCapability("OWNER_ADMIN", "people", "INVITE")).toBe(true);
  });
});

describe("client slug", () => {
  it("slugifies legal names", () => {
    expect(slugifyClientName("Acme UK Ltd.")).toBe("acme-uk-ltd");
  });
});

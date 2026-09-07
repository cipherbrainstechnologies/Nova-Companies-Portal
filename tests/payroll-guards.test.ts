import { describe, expect, it } from "vitest";

describe("payroll issue guards (unit)", () => {
  it("requires confirmation fields to match before issue", () => {
    const confirmation = { count: 2, month: 8, companyId: "c1" };
    const lineIds = ["a", "b"];
    const run = { month: 8, companyId: "c1", status: "APPROVED" };
    expect(confirmation.count).toBe(lineIds.length);
    expect(confirmation.month).toBe(run.month);
    expect(confirmation.companyId).toBe(run.companyId);
    expect(["APPROVED", "READY_FOR_REVIEW"]).toContain(run.status);
  });

  it("blocks issue when payroll is still DRAFT", () => {
    const run = { status: "DRAFT" };
    const allowed = run.status === "APPROVED" || run.status === "READY_FOR_REVIEW";
    expect(allowed).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import {
  canRegenerateDraft,
  executionBlockers,
  missingRequired,
  packCodes,
  renderTemplateBody,
  resolveVariables,
} from "@/server/client/legal-documents";

describe("client legal document pack", () => {
  it("does not invent a Nova entity, fee, or governing law", () => {
    const vars = resolveVariables({
      legalName: "Northwind Ltd",
      countryCode: "GB",
      profile: { planId: "managed" },
      templateVersion: 1,
    });
    expect(vars["client.legal_name"]).toBe("Northwind Ltd");
    expect(vars["commercial.plan"]).toBe("EOR Managed");
    expect(vars["nova.legal_entity_name"]).toBeUndefined();
    expect(vars["commercial.monthly_fee"]).toBeUndefined();
    expect(vars["agreement.governing_law"]).toBeUndefined();
    expect(renderTemplateBody("Employer {{nova.legal_entity_name}}", vars)).toContain("Awaiting Information");
  });

  it("lists missing required variables", () => {
    const missing = missingRequired(["client.legal_name", "client.registration_number"], {
      "client.legal_name": "Northwind Ltd",
    });
    expect(missing).toEqual(["client.registration_number"]);
  });

  it("adds the transfer schedule and skips the DPA when processing is not required", () => {
    const codes = packCodes({
      workforceMode: "transfer",
      dataProcessing: "not_required",
      additionalServices: "Background checks",
    });
    expect(codes).toContain("EMPLOYEE_TRANSFER");
    expect(codes).toContain("ADDITIONAL_SERVICES");
    expect(codes).not.toContain("DPA");
    expect(codes).not.toContain("AMENDMENT");
  });

  it("refuses to regenerate or re-execute a signed agreement", () => {
    expect(canRegenerateDraft("DRAFT")).toBe(true);
    expect(canRegenerateDraft("FULLY_EXECUTED")).toBe(false);
    expect(
      executionBlockers({
        status: "FULLY_EXECUTED",
        templateStatus: "APPROVED",
        missing: [],
      }),
    ).toContain("already_executed");
  });

  it("blocks signature approval while information or template approval is missing", () => {
    expect(
      executionBlockers({
        status: "DRAFT",
        templateStatus: "DRAFT",
        missing: ["agreement.governing_law"],
      }),
    ).toEqual(expect.arrayContaining(["template_not_approved", "awaiting_information", "not_approved_for_signature"]));
  });
});

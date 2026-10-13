import { describe, expect, it } from "vitest";
import { classifyOnboardingSubmit } from "../src/server/client/kyb-service";

describe("client onboarding submit", () => {
  it("allows a draft or in-progress case to be submitted once", () => {
    expect(classifyOnboardingSubmit("DRAFT")).toBe("submit");
    expect(classifyOnboardingSubmit("INVITED")).toBe("submit");
    expect(classifyOnboardingSubmit("KYB_IN_PROGRESS")).toBe("submit");
    expect(classifyOnboardingSubmit("CHANGES_REQUESTED")).toBe("submit");
  });

  it("treats a repeated submit as already submitted", () => {
    expect(classifyOnboardingSubmit("KYB_REVIEW")).toBe("already");
    expect(classifyOnboardingSubmit("COMPLIANCE_REVIEW")).toBe("already");
    expect(classifyOnboardingSubmit("CONTRACT_PENDING")).toBe("already");
    expect(classifyOnboardingSubmit("SIGNATURE_PENDING")).toBe("already");
  });

  it("blocks submit after activation, rejection, or closure", () => {
    expect(classifyOnboardingSubmit("ACTIVE")).toBe("blocked");
    expect(classifyOnboardingSubmit("REJECTED")).toBe("blocked");
    expect(classifyOnboardingSubmit("SUSPENDED")).toBe("blocked");
    expect(classifyOnboardingSubmit("CLOSED")).toBe("blocked");
  });
});

import { describe, expect, it } from "vitest";
import { calculateTdsProjection, TDS_DISCLAIMER } from "../src/server/tds/tds-engine";

describe("tds engine", () => {
  it("is driven by FY config slabs", () => {
    const low = calculateTdsProjection({
      monthlyTaxableComponents: 20000,
      monthsElapsed: 3,
      deductedYtd: 0,
      regime: "NEW",
      config: {
        slabs: [
          { upTo: 300000, rate: 0 },
          { upTo: 700000, rate: 0.05 },
          { upTo: null, rate: 0.1 },
        ],
        standardDeduction: 50000,
      },
    });
    const high = calculateTdsProjection({
      monthlyTaxableComponents: 200000,
      monthsElapsed: 3,
      deductedYtd: 0,
      regime: "NEW",
      config: {
        slabs: [
          { upTo: 300000, rate: 0 },
          { upTo: 700000, rate: 0.05 },
          { upTo: null, rate: 0.2 },
        ],
        standardDeduction: 50000,
      },
    });
    expect(high.projectedAnnualTax).toBeGreaterThan(low.projectedAnnualTax);
    expect(low.disclaimer).toBe(TDS_DISCLAIMER);
  });
});

import { describe, expect, it } from "vitest";
import Decimal from "decimal.js";
import { buildIllustrativeFxQuote, roundMoney } from "../src/lib/public/fx-illustration";

const createdAt = new Date("2026-10-13T10:00:00.000Z");

describe("fx illustration rounding", () => {
  it("rounds half up to two decimal places", () => {
    expect(roundMoney(new Decimal("1.005"))).toBe("1.01");
    expect(roundMoney(new Decimal("1.004"))).toBe("1.00");
    expect(roundMoney(new Decimal("950.570342205323"))).toBe("950.57");
  });

  it("converts an INR employment cost at the sample GBP rate", () => {
    const quote = buildIllustrativeFxQuote({
      employmentCostInr: "100000",
      currency: "GBP",
      createdAt,
    });
    expect(quote.ok).toBe(true);
    if (!quote.ok) return;
    expect(quote.inrPerUnit).toBe("105.20");
    expect(quote.referenceSettlement).toBe("950.57");
    expect(quote.spreadBps).toBe(0);
    expect(quote.spreadInSettlement).toBe("0.00");
    expect(quote.novaFeeInSettlement).toBe("0.00");
    expect(quote.quotedSettlement).toBe("950.57");
    expect(quote.amountReceived).toBe("950.57");
    expect(quote.shortfall).toBe("0.00");
    expect(quote.createdAtIso).toBe("2026-10-13T10:00:00.000Z");
    expect(quote.expiresAtIso).toBe("2026-10-14T10:00:00.000Z");
  });

  it("adds a disclosed spread and a separate INR fee after rounding each line", () => {
    const quote = buildIllustrativeFxQuote({
      employmentCostInr: "100000",
      currency: "GBP",
      spreadBps: 100,
      novaFeeInr: "5000",
      createdAt,
    });
    expect(quote.ok).toBe(true);
    if (!quote.ok) return;
    expect(quote.referenceSettlement).toBe("950.57");
    expect(quote.spreadInSettlement).toBe("9.51");
    expect(quote.novaFeeInSettlement).toBe("47.53");
    expect(quote.quotedSettlement).toBe("1007.61");
  });

  it("reconciles a bank deduction as a shortfall against the quoted settlement", () => {
    const quote = buildIllustrativeFxQuote({
      employmentCostInr: "100000",
      currency: "AED",
      bankDeduction: "10",
      createdAt,
    });
    expect(quote.ok).toBe(true);
    if (!quote.ok) return;
    expect(quote.referenceSettlement).toBe("4395.60");
    expect(quote.amountReceived).toBe("4385.60");
    expect(quote.shortfall).toBe("10.00");
  });

  it("rejects blank, zero, and negative amounts", () => {
    expect(buildIllustrativeFxQuote({ employmentCostInr: "", currency: "USD" }).ok).toBe(false);
    expect(buildIllustrativeFxQuote({ employmentCostInr: "0", currency: "USD" }).ok).toBe(false);
    expect(buildIllustrativeFxQuote({ employmentCostInr: "-5", currency: "USD" }).ok).toBe(false);
    expect(buildIllustrativeFxQuote({ employmentCostInr: "100", currency: "USD", spreadBps: 1.5 }).ok).toBe(false);
    expect(buildIllustrativeFxQuote({ employmentCostInr: "100", currency: "USD", novaFeeInr: "-1" }).ok).toBe(false);
  });
});

import { describe, expect, it } from "vitest";

describe("profit reporting labels", () => {
  it("never treats bank balance as earned profit", () => {
    const revenue = 100000;
    const businessExpenses = 40000;
    const ownerFinancingOutgoings = 25000;
    const bankBalance = 999999;
    const earnedOperatingProfit = revenue - businessExpenses;
    const cashRemaining = earnedOperatingProfit - ownerFinancingOutgoings;
    expect(earnedOperatingProfit).toBe(60000);
    expect(cashRemaining).toBe(35000);
    expect(earnedOperatingProfit).not.toBe(bankBalance);
    expect(cashRemaining).not.toBe(bankBalance);
  });
});

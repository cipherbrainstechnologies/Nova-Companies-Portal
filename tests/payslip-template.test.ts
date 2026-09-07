import { describe, expect, it } from "vitest";
import { amountInWordsInr } from "../src/server/payroll/amount-in-words";
import { renderPayslipHtml } from "../src/server/payroll/payslip-template";

describe("payslip template", () => {
  it("includes Dheeraj Yadav fixture figures in HTML", () => {
    const html = renderPayslipHtml({
      companyName: "Nova Workforce",
      companyGstin: "Needs configuration",
      companyAddress: "Needs configuration",
      month: 8,
      year: 2026,
      employeeCode: "NW-0019",
      employeeName: "Dheeraj Yadav",
      designation: "Staff",
      department: "Ops",
      location: "India",
      working: { wd: 26, wo: 4, ph: 0, pd: 26, cl: 0, pl: 0, sl: 0, lwp: 0 },
      earnings: [
        { code: "BASIC", label: "Consolidated/Basic", actual: 17500, payable: 17500 },
        { code: "HRA", label: "HRA", actual: 8750, payable: 8750 },
        { code: "CONV", label: "Conveyance", actual: 1200, payable: 1200 },
        { code: "MED", label: "Medical allowance", actual: 1000, payable: 1000 },
        { code: "SPEC", label: "Special allowance", actual: 2600, payable: 2600 },
        { code: "TRAV", label: "Travel allowance", actual: 1200, payable: 1200 },
        { code: "OTHER", label: "Other allowance", actual: 2750, payable: 2750 },
      ],
      deductions: [{ code: "PT", label: "Professional tax", amount: 200 }],
      grossEarnings: 35000,
      grossDeductions: 1329,
      netAmount: 33671,
      amountInWords: amountInWordsInr(33671),
    });
    expect(html).toContain("Dheeraj Yadav");
    expect(html).toContain("35,000.00");
    expect(html).toContain("33,671.00");
    expect(html).toContain("computer generated statement");
  });
});

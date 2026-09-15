import { describe, expect, it } from "vitest";
import { amountInWordsInr } from "../src/server/payroll/amount-in-words";
import {
  renderPayslipHtml,
  renderPayslipHtmlFromTemplate,
} from "../src/server/payroll/payslip-template";

const fixture = {
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
    { code: "BASIC", label: "Consol.Basic", actual: 17500, payable: 17500 },
    { code: "HRA", label: "HRA", actual: 8750, payable: 8750 },
    { code: "CONVEYANCE", label: "CONV", actual: 1200, payable: 1200 },
    { code: "MEDICAL", label: "MEDI. ALL", actual: 1000, payable: 1000 },
    { code: "SPECIAL", label: "SP. ALL", actual: 2600, payable: 2600 },
    { code: "TRAVEL", label: "TRAVEL. ALL", actual: 1200, payable: 1200 },
    { code: "OTHER_ALLOWANCE", label: "OTHER ALL", actual: 2750, payable: 2750 },
  ],
  deductions: [{ code: "PT", label: "P.T.", amount: 200 }],
  grossEarnings: 35000,
  grossDeductions: 1329,
  netAmount: 33671,
  amountInWords: amountInWordsInr(33671),
};

describe("payslip template", () => {
  it("renders Form IV-B layout matching Parth Virani reference pattern", () => {
    const html = renderPayslipHtml(fixture);
    expect(html).toContain("Dheeraj Yadav".toUpperCase());
    expect(html).toContain("Form IV B [ Rule 26(2) (b) ]");
    expect(html).toContain("Salary for the month of :- August-2026");
    expect(html).toContain("WORKING DETAILS");
    expect(html).toContain("EARNING DETAILS");
    expect(html).toContain("DEDUCTION DETAILS");
    expect(html).toContain("Consol.Basic");
    expect(html).toContain("P.T.");
    expect(html).toContain("35,000.00");
    expect(html).toContain("33,671.00");
    expect(html).toContain("Net Amount");
    expect(html).toContain("computer generated statement hence does not require a signature");
  });

  it("fills standard Form IV-B rows with zeros when components are absent", () => {
    const html = renderPayslipHtml(fixture);
    expect(html).toContain("DA");
    expect(html).toContain("LEAVE WAGES");
    expect(html).toContain("P.F");
    expect(html).toContain("I.T.");
    expect(html).toContain("Canteen/Food");
    expect(html).toContain("NOT APPLICABLE");
  });

  it("replaces known placeholders from custom template body", () => {
    const html = renderPayslipHtmlFromTemplate(
      `<section>
        <h1>{{companyName}}</h1>
        <p>{{employeeName}} · {{employeeCode}}</p>
        <p>Period {{period}}</p>
        <p>Net {{netAmount}}</p>
        <p>{{amountInWords}}</p>
        {{earnings}}
        {{deductions}}
      </section>`,
      "body { color: #222; }",
      fixture,
    );
    expect(html).toContain("Nova Workforce");
    expect(html).toContain("Dheeraj Yadav");
    expect(html).toContain("NW-0019");
    expect(html).toContain("08/2026");
    expect(html).toContain("33,671.00");
    expect(html).toContain("Consol.Basic");
    expect(html).toContain("P.T.");
    expect(html).toContain("color: #222");
    expect(html).not.toContain("{{companyName}}");
  });

  it("falls back to default layout when template body is empty", () => {
    const html = renderPayslipHtmlFromTemplate("   ", null, fixture);
    expect(html).toContain("Form IV B");
    expect(html).toContain("Dheeraj Yadav".toUpperCase());
  });

  it("matches Parth Virani August 2026 figures and wording", () => {
    const parth = {
      ...fixture,
      companyName: "NexusQuest",
      companyGstin: "24ALSPC1986E2Z0",
      companyAddress: "L-18, SHAYONA CITY PART-1, R C TECHNICAL ROAD, GHATLODIA, AHMEDABAD-380061 (GJ)",
      employeeCode: "NQ025",
      employeeName: "Parth Virani",
      designation: "Full Stack Engineer",
      department: "Technology",
      location: "Ahmedabad",
      doj: "2026-08-10",
      working: { wd: 31, wo: 0, ph: 0, pd: 29, cl: 0, pl: 0, sl: 0, lwp: 0 },
      earnings: [
        { code: "BASIC", label: "Consol.Basic", actual: 54000, payable: 50500 },
        { code: "DA", label: "DA", actual: 0, payable: 0 },
        { code: "HRA", label: "HRA", actual: 27000, payable: 25250 },
        { code: "CONVEYANCE", label: "CONV", actual: 2600, payable: 2400 },
        { code: "MEDICAL", label: "MEDI. ALL", actual: 2300, payable: 2100 },
        { code: "SPECIAL", label: "SP. ALL", actual: 9400, payable: 8800 },
        { code: "TRAVEL", label: "TRAVEL. ALL", actual: 2600, payable: 2400 },
        { code: "OTHER_ALLOWANCE", label: "OTHER ALL", actual: 10434, payable: 9895 },
      ],
      deductions: [
        { code: "PT", label: "P.T.", amount: 200 },
        { code: "TDS", label: "I.T.", amount: 5525 },
      ],
      grossEarnings: 101345,
      grossDeductions: 5725,
      netAmount: 95620,
      amountInWords: amountInWordsInr(95620),
    };
    const html = renderPayslipHtml(parth);
    expect(html).toContain("NQ025");
    expect(html).toContain("PARTH VIRANI");
    expect(html).toContain("FULL STACK ENGINEER");
    expect(html).toContain("10TH AUGUST 2026");
    expect(html).toContain("50,500.00");
    expect(html).toContain("1,01,345.00");
    expect(html).toContain("5,725.00");
    expect(html).toContain("95,620.00");
    expect(html).toContain("Rupees Ninety Five Thousand Six Hundred Twenty Only");
  });
});

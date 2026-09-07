import { describe, expect, it } from "vitest";
import { assertIdentity, money, roundInr } from "../src/server/finance/money";
import {
  employeeFolderName,
  payslipFolderPrefix,
  payslipPdfFileName,
  profitFolderPrefix,
  profitSheetFileName,
} from "../src/server/documents/naming";
import { groupPayslipsAsFolders } from "../src/server/documents/folder-tree";

describe("money math", () => {
  it("keeps INR identities exact to 2 decimals", () => {
    const revenue = roundInr("100000.105");
    const expenses = roundInr("33333.335");
    const eop = roundInr(money(revenue).minus(expenses));
    assertIdentity("eop", eop, money(revenue).minus(expenses));
    expect(eop).toBe(66666.77);
  });
});

describe("document naming", () => {
  it("builds employee/month folder paths", () => {
    const folder = payslipFolderPrefix({
      companyPrefix: "NW",
      employeeCode: "NW-0020",
      firstName: "Demo",
      lastName: "Employee",
      year: 2026,
      month: 8,
    });
    expect(folder).toBe("payslips/NW/NW-0020_Employee_Demo/2026-08");
    expect(
      payslipPdfFileName({ employeeCode: "NW-0020", year: 2026, month: 8, version: 1 }),
    ).toBe("Payslip_NW-0020_2026-08_v1.pdf");
    expect(profitFolderPrefix({ companyPrefix: "NQ", year: 2026, month: 9 })).toBe(
      "profit/NQ/2026-09",
    );
    expect(profitSheetFileName({ companyPrefix: "NQ", year: 2026, month: 9 })).toBe(
      "Profit_Sheet_NQ_2026-09.json",
    );
    expect(employeeFolderName({ employeeCode: "NW-0019", firstName: "Dheeraj", lastName: "Yadav" })).toBe(
      "NW-0019_Yadav_Dheeraj",
    );
  });
});

describe("folder tree", () => {
  it("groups slips by employee then month", () => {
    const tree = groupPayslipsAsFolders([
      {
        id: "1",
        status: "ISSUED",
        verificationCode: "ABC",
        currentVersion: 1,
        employeeCode: "NW-0020",
        employeeName: "Demo Employee",
        companyPrefix: "NW",
        year: 2026,
        month: 8,
      },
      {
        id: "2",
        status: "ISSUED",
        verificationCode: "DEF",
        currentVersion: 1,
        employeeCode: "NW-0020",
        employeeName: "Demo Employee",
        companyPrefix: "NW",
        year: 2026,
        month: 9,
      },
    ]);
    expect(tree).toHaveLength(1);
    expect(tree[0].months).toHaveLength(2);
    expect(tree[0].months[0].period >= tree[0].months[1].period).toBe(true);
  });
});

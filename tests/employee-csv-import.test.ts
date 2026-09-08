import { describe, expect, it } from "vitest";
import {
  EMPLOYEE_IMPORT_HEADERS,
  parseEmployeeCsv,
  splitEmployeeName,
} from "@/server/employees/csv-import";

const companies = [{ id: "company-1", name: "Nova Companies Pvt Ltd" }];

function csv(row: string, grossHeader = "Gross Salary") {
  return `${EMPLOYEE_IMPORT_HEADERS.map((header) =>
    header === "Gross Salary" ? grossHeader : header,
  ).join(",")}\n${row}`;
}

describe("employee CSV import", () => {
  it("parses a valid row with rupees and quoted commas", () => {
    const [row] = parseEmployeeCsv(
      csv('"Jeena Ann John",Engineer,08/09/2026,"₹6,00,000","₹50,000",2000,200,"₹47,800",Nova Companies Pvt Ltd'),
      companies,
    );
    expect(row.errors).toEqual([]);
    expect(row.data).toMatchObject({
      displayName: "Jeena Ann John",
      annualCtc: 600000,
      monthlyGross: 50000,
      expectedMonthlyNet: 47800,
      companyId: "company-1",
    });
  });

  it("treats blank TDS as configured zero", () => {
    const [row] = parseEmployeeCsv(
      csv("Asha Rao,Analyst,2026-09-08,480000,40000,,200,39800,Nova Companies Pvt Ltd"),
      companies,
    );
    expect(row.data?.monthlyTds).toBe(0);
    expect(row.warnings).toContain("Blank TDS treated as 0");
  });

  it("accepts the Grosss Salary alias", () => {
    const [row] = parseEmployeeCsv(
      csv("Asha Rao,Analyst,2026-09-08,480000,40000,0,200,39800,Nova Companies Pvt Ltd", "Grosss Salary"),
      companies,
    );
    expect(row.errors).toEqual([]);
    expect(row.data?.monthlyGross).toBe(40000);
  });

  it("flags invalid dates and amounts", () => {
    const [row] = parseEmployeeCsv(
      csv("Asha Rao,Analyst,31/02/2026,nope,40000,0,200,39800,Nova Companies Pvt Ltd"),
      companies,
    );
    expect(row.data).toBeNull();
    expect(row.errors).toContain("Date of Joining must be ISO or dd/mm/yyyy");
    expect(row.errors).toContain("CTC is invalid");
  });

  it("flags salary mismatches without inventing deductions", () => {
    const [row] = parseEmployeeCsv(
      csv("Asha Rao,Analyst,2026-09-08,480000,40000,1000,200,35000,Nova Companies Pvt Ltd"),
      companies,
    );
    expect(row.data?.monthlyTds).toBe(1000);
    expect(row.data?.monthlyPt).toBe(200);
    expect(row.warnings[0]).toContain("Net Salary mismatch");
  });

  it("rejects an unknown company", () => {
    const [row] = parseEmployeeCsv(
      csv("Asha Rao,Analyst,2026-09-08,480000,40000,0,200,39800,Unknown Ltd"),
      companies,
    );
    expect(row.data).toBeNull();
    expect(row.errors).toContain("Company Name does not match an existing company");
  });

  it("preserves middle names in display and last name", () => {
    expect(splitEmployeeName("  Jeena   Ann   John  ")).toEqual({
      displayName: "Jeena Ann John",
      firstName: "Jeena",
      lastName: "Ann John",
    });
  });
});

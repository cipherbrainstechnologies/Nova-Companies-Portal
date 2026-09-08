import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  EMPLOYEE_IMPORT_HEADERS,
  normalizeCompanyName,
  parseEmployeeCsv,
  resolveCompanyMatch,
  splitEmployeeName,
} from "@/server/employees/csv-import";

const companies = [
  { id: "nw-1", name: "Nova Workforce" },
  { id: "nq-1", name: "Nova Qore" },
];

function csv(row: string, grossHeader = "Gross Salary") {
  return `${EMPLOYEE_IMPORT_HEADERS.map((header) =>
    header === "Gross Salary" ? grossHeader : header,
  ).join(",")}\n${row}`;
}

describe("employee CSV import", () => {
  it("parses a valid row with rupees and quoted commas", () => {
    const [row] = parseEmployeeCsv(
      csv('"Jeena Ann John",Engineer,08/09/2026,"₹6,00,000","₹50,000",2000,200,"₹47,800",Nova Workforce'),
      companies,
    );
    expect(row.errors).toEqual([]);
    expect(row.data).toMatchObject({
      displayName: "Jeena Ann John",
      annualCtc: 600000,
      monthlyGross: 50000,
      expectedMonthlyNet: 47800,
      companyId: "nw-1",
    });
  });

  it("treats blank TDS as configured zero", () => {
    const [row] = parseEmployeeCsv(
      csv("Asha Rao,Analyst,2026-09-08,480000,40000,,200,39800,Nova Qore"),
      companies,
    );
    expect(row.data?.monthlyTds).toBe(0);
    expect(row.warnings).toContain("Blank TDS treated as 0");
  });

  it("accepts the Grosss Salary alias", () => {
    const [row] = parseEmployeeCsv(
      csv("Asha Rao,Analyst,2026-09-08,480000,40000,0,200,39800,Nova Qore", "Grosss Salary"),
      companies,
    );
    expect(row.errors).toEqual([]);
    expect(row.data?.monthlyGross).toBe(40000);
  });

  it("flags invalid dates and amounts", () => {
    const [row] = parseEmployeeCsv(
      csv("Asha Rao,Analyst,31/02/2026,nope,40000,0,200,39800,Nova Workforce"),
      companies,
    );
    expect(row.data).toBeNull();
    expect(row.errors).toContain("Date of Joining must be ISO or dd/mm/yyyy");
    expect(row.errors).toContain("CTC is invalid");
    expect(row.displayName).toBe("Asha Rao");
    expect(row.companyNameText).toBe("Nova Workforce");
  });

  it("flags salary mismatches without inventing deductions", () => {
    const [row] = parseEmployeeCsv(
      csv("Asha Rao,Analyst,2026-09-08,480000,40000,1000,200,35000,Nova Qore"),
      companies,
    );
    expect(row.data?.monthlyTds).toBe(1000);
    expect(row.data?.monthlyPt).toBe(200);
    expect(row.warnings[0]).toContain("Net Salary mismatch");
  });

  it("rejects an unknown company without falling back to another employer", () => {
    const [row] = parseEmployeeCsv(
      csv("Asha Rao,Analyst,2026-09-08,480000,40000,0,200,39800,Unknown Ltd"),
      companies,
    );
    expect(row.data).toBeNull();
    expect(row.errors).toContain("Company Name does not match an existing company");
    expect(row.companyNameText).toBe("Unknown Ltd");
  });

  it("does not match when the authorised list only contains the other company", () => {
    const [row] = parseEmployeeCsv(
      csv("Asha Rao,Analyst,2026-09-08,480000,40000,0,200,39800,Nova Workforce"),
      [{ id: "nq-1", name: "Nova Qore" }],
    );
    expect(row.data).toBeNull();
    expect(row.errors).toContain("Company Name does not match an existing company");
  });

  it("normalizes NBSP, repeated whitespace, case, and NFKC before matching", () => {
    expect(normalizeCompanyName("  Nova\u00a0Workforce  ")).toBe("nova workforce");
    expect(normalizeCompanyName("NOVA   WORKFORCE")).toBe("nova workforce");
    const match = resolveCompanyMatch("Nova\u00a0Workforce", [
      { id: "nw-1", name: "Nova Workforce" },
      { id: "nq-1", name: "Nova Qore" },
    ]);
    expect(match).toEqual({ status: "matched", company: { id: "nw-1", name: "Nova Workforce" } });
  });

  it("requires explicit selection when multiple companies normalize identically", () => {
    const match = resolveCompanyMatch("Acme", [
      { id: "a", name: "Acme" },
      { id: "b", name: "  ACME " },
    ]);
    expect(match.status).toBe("ambiguous");
    const [row] = parseEmployeeCsv(
      csv("Asha Rao,Analyst,2026-09-08,480000,40000,0,200,39800,Acme"),
      [
        { id: "a", name: "Acme" },
        { id: "b", name: "ACME" },
      ],
    );
    expect(row.data).toBeNull();
    expect(row.errors[0]).toContain("matches multiple companies");
  });

  it("preserves middle names in display and last name", () => {
    expect(splitEmployeeName("  Jeena   Ann   John  ")).toEqual({
      displayName: "Jeena Ann John",
      firstName: "Jeena",
      lastName: "Ann John",
    });
  });

  it("resolves employee-import-iso-dates.csv: 17 Nova Workforce + 23 Nova Qore", () => {
    const fixture = readFileSync(
      join(process.cwd(), "tests/fixtures/employee-import-iso-dates.csv"),
      "utf8",
    );
    const rows = parseEmployeeCsv(fixture, companies);
    expect(rows).toHaveLength(40);
    const nw = rows.filter((row) => row.data?.companyId === "nw-1");
    const nq = rows.filter((row) => row.data?.companyId === "nq-1");
    expect(nw).toHaveLength(17);
    expect(nq).toHaveLength(23);
    expect(rows.every((row) => row.errors.length === 0)).toBe(true);
    expect(rows.every((row) => row.data?.dateOfJoining instanceof Date)).toBe(true);
    expect(rows.every((row) => (row.data?.monthlyGross ?? 0) > 0)).toBe(true);
  });
});

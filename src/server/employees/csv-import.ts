import { z } from "zod";
import type { GlobalRole } from "@prisma/client";
import { money, roundInr } from "@/server/finance/money";
import { prisma } from "@/server/db";
import { employeeFacade } from "@/server/facades/employee-facade";

export const EMPLOYEE_IMPORT_HEADERS = [
  "Name",
  "Position",
  "Date of Joining",
  "CTC",
  "Gross Salary",
  "TDS",
  "Professional Tax",
  "Net Salary",
  "Company Name",
] as const;

export const EMPLOYEE_IMPORT_TEMPLATE = `${EMPLOYEE_IMPORT_HEADERS.join(",")}\r\n`;

export type CompanyOption = { id: string; name: string };
type CsvRecord = Record<string, string>;

export type ParsedEmployeeImportRow = {
  rowNumber: number;
  raw: CsvRecord;
  /** Always populated from CSV text for preview, even when the row is invalid. */
  displayName: string;
  companyNameText: string;
  designationText: string;
  data: {
    companyId: string;
    companyName: string;
    displayName: string;
    firstName: string;
    lastName: string;
    designation?: string;
    dateOfJoining: Date;
    annualCtc: number;
    monthlyGross: number;
    monthlyTds: number;
    monthlyPt: number;
    expectedMonthlyNet: number;
  } | null;
  errors: string[];
  warnings: string[];
};

const rowSchema = z.object({
  Name: z.string(),
  Position: z.string(),
  "Date of Joining": z.string(),
  CTC: z.string(),
  "Gross Salary": z.string(),
  TDS: z.string(),
  "Professional Tax": z.string(),
  "Net Salary": z.string(),
  "Company Name": z.string(),
});

/** Unicode NFKC → trim → collapse whitespace → lowercase. */
export function normalizeCompanyName(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[\u00a0\u2007\u202f]/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export type CompanyMatchResult =
  | { status: "matched"; company: CompanyOption }
  | { status: "none" }
  | { status: "ambiguous"; companies: CompanyOption[] };

export function resolveCompanyMatch(
  companyNameText: string,
  companies: CompanyOption[],
): CompanyMatchResult {
  const needle = normalizeCompanyName(companyNameText);
  if (!needle) return { status: "none" };
  const matches = companies.filter(
    (candidate) => normalizeCompanyName(candidate.name) === needle,
  );
  if (matches.length === 1) return { status: "matched", company: matches[0] };
  if (matches.length > 1) return { status: "ambiguous", companies: matches };
  return { status: "none" };
}

/** Companies the actor may import employees into. */
export async function listImportableCompanies(input: {
  userId: string;
  globalRole: GlobalRole;
}): Promise<CompanyOption[]> {
  if (input.globalRole === "SUPER_ADMIN") {
    return prisma.company.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  }
  const grants = await prisma.permissionGrant.findMany({
    where: {
      userId: input.userId,
      module: "employees",
      action: "create",
    },
    select: { companyId: true },
  });
  const ids = [...new Set(grants.map((g) => g.companyId))];
  if (!ids.length) return [];
  return prisma.company.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

function parseCsvMatrix(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    if (quoted) {
      if (char === '"' && csv[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (quoted) throw new Error("CSV contains an unterminated quoted field");
  if (field.length || row.length) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows.filter((values) => values.some((value) => value.trim()));
}

function canonicalHeader(header: string) {
  const clean = header.replace(/^\uFEFF/, "").trim();
  return clean === "Grosss Salary" ? "Gross Salary" : clean;
}

export function splitEmployeeName(value: string) {
  const displayName = value.trim().replace(/\s+/g, " ");
  const [firstName = "", ...remaining] = displayName.split(" ");
  return { displayName, firstName, lastName: remaining.join(" ") };
}

export function parseImportDate(value: string): Date | null {
  const clean = value.trim();
  let year: number;
  let month: number;
  let day: number;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(clean);
  const indian = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(clean);
  if (iso) [, year, month, day] = iso.map(Number);
  else if (indian) [, day, month, year] = indian.map(Number);
  else return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? date
    : null;
}

export function parseImportAmount(value: string): number | null {
  const clean = value.trim().replace(/₹/g, "").replace(/,/g, "").replace(/\s/g, "");
  if (!clean || !/^\d+(?:\.\d{1,2})?$/.test(clean)) return null;
  try {
    const amount = money(clean);
    return amount.isNegative() || !amount.isFinite() ? null : roundInr(amount);
  } catch {
    return null;
  }
}

function parseRow(raw: CsvRecord, rowNumber: number, companies: CompanyOption[]): ParsedEmployeeImportRow {
  const parsed = rowSchema.safeParse(raw);
  const errors: string[] = [];
  const warnings: string[] = [];
  const companyNameText = String(raw["Company Name"] ?? "").trim();
  const nameHint = splitEmployeeName(String(raw.Name ?? ""));
  const designationText = String(raw.Position ?? "").trim();

  if (!parsed.success) {
    return {
      rowNumber,
      raw,
      displayName: nameHint.displayName || "—",
      companyNameText: companyNameText || "—",
      designationText: designationText || "—",
      data: null,
      errors: ["Row is missing required columns"],
      warnings,
    };
  }

  const name = splitEmployeeName(parsed.data.Name);
  if (!name.firstName) errors.push("Name is required");
  const dateOfJoining = parseImportDate(parsed.data["Date of Joining"]);
  if (!dateOfJoining) errors.push("Date of Joining must be ISO or dd/mm/yyyy");

  const annualCtc = parseImportAmount(parsed.data.CTC);
  const monthlyGross = parseImportAmount(parsed.data["Gross Salary"]);
  const monthlyPt = parseImportAmount(parsed.data["Professional Tax"]);
  const expectedMonthlyNet = parseImportAmount(parsed.data["Net Salary"]);
  const monthlyTds = parsed.data.TDS.trim() === "" ? 0 : parseImportAmount(parsed.data.TDS);
  if (parsed.data.TDS.trim() === "") warnings.push("Blank TDS treated as 0");

  if (annualCtc == null) errors.push("CTC is invalid");
  if (monthlyGross == null) errors.push("Gross Salary is invalid");
  if (monthlyTds == null) errors.push("TDS is invalid");
  if (monthlyPt == null) errors.push("Professional Tax is invalid");
  if (expectedMonthlyNet == null) errors.push("Net Salary is invalid");

  const companyMatch = resolveCompanyMatch(parsed.data["Company Name"], companies);
  let company: CompanyOption | null = null;
  if (companyMatch.status === "matched") {
    company = companyMatch.company;
  } else if (companyMatch.status === "ambiguous") {
    errors.push(
      `Company Name matches multiple companies (${companyMatch.companies
        .map((c) => c.name)
        .join(", ")}). Choose explicitly before import.`,
    );
  } else {
    errors.push("Company Name does not match an existing company");
  }

  if (
    monthlyGross != null &&
    monthlyTds != null &&
    monthlyPt != null &&
    expectedMonthlyNet != null
  ) {
    const calculated = money(monthlyGross).minus(monthlyTds).minus(monthlyPt);
    if (calculated.minus(expectedMonthlyNet).abs().greaterThan(0.01)) {
      warnings.push(
        `Net Salary mismatch: expected ${calculated.toFixed(2)} from gross − TDS − professional tax`,
      );
    }
  }

  return {
    rowNumber,
    raw,
    displayName: name.displayName || nameHint.displayName || "—",
    companyNameText: parsed.data["Company Name"].trim() || companyNameText || "—",
    designationText: parsed.data.Position.trim() || designationText || "—",
    data:
      errors.length || !company || !dateOfJoining ||
      annualCtc == null || monthlyGross == null || monthlyTds == null ||
      monthlyPt == null || expectedMonthlyNet == null
        ? null
        : {
            companyId: company.id,
            companyName: company.name,
            ...name,
            designation: parsed.data.Position.trim() || undefined,
            dateOfJoining,
            annualCtc,
            monthlyGross,
            monthlyTds,
            monthlyPt,
            expectedMonthlyNet,
          },
    errors,
    warnings,
  };
}

export function parseEmployeeCsv(csv: string, companies: CompanyOption[]): ParsedEmployeeImportRow[] {
  const matrix = parseCsvMatrix(csv);
  if (!matrix.length) throw new Error("CSV is empty");
  const headers = matrix[0].map(canonicalHeader);
  for (const required of EMPLOYEE_IMPORT_HEADERS) {
    if (!headers.includes(required)) throw new Error(`Missing required header: ${required}`);
  }
  return matrix.slice(1).map((values, index) => {
    const raw = Object.fromEntries(headers.map((header, column) => [header, values[column] ?? ""]));
    return parseRow(raw, index + 2, companies);
  });
}

export async function previewEmployeeCsv(input: {
  actorUserId: string;
  globalRole: GlobalRole;
  /** UI context only — never used as a silent fallback employer. */
  contextCompanyId?: string;
  fileName: string;
  csv: string;
}) {
  const companies = await listImportableCompanies({
    userId: input.actorUserId,
    globalRole: input.globalRole,
  });
  if (!companies.length) {
    throw new Error("No companies are available for employee import");
  }

  const rows = parseEmployeeCsv(input.csv, companies);
  const errorCount = rows.filter((row) => row.errors.length > 0).length;
  const batch = await prisma.employeeImportBatch.create({
    data: {
      actorUserId: input.actorUserId,
      // Context company is optional metadata; rows carry resolved company IDs.
      companyId: input.contextCompanyId ?? null,
      fileName: input.fileName,
      status: "PREVIEWED",
      rowCount: rows.length,
      errorCount,
      summaryJson: {
        warningCount: rows.filter((row) => row.warnings.length).length,
        importableCompanyIds: companies.map((c) => c.id),
      },
      rows: {
        create: rows.map((row) => ({
          rowNumber: row.rowNumber,
          rawJson: row.raw,
          status: row.errors.length ? "ERROR" : "PENDING",
          errorsJson: row.errors,
          warningsJson: row.warnings,
          resolvedCompanyId: row.data?.companyId ?? null,
          parsedJson: row.data
            ? {
                ...row.data,
                dateOfJoining: row.data.dateOfJoining.toISOString(),
              }
            : {
                displayName: row.displayName,
                companyNameText: row.companyNameText,
                designationText: row.designationText,
              },
        })),
      },
    },
  });
  return { batchId: batch.id, rows, rowCount: rows.length, errorCount };
}

export async function confirmEmployeeCsvImport(input: {
  actorUserId: string;
  globalRole: GlobalRole;
  batchId: string;
  decisions: Array<{
    rowNumber: number;
    action: "create" | "update" | "skip";
    employeeId?: string;
  }>;
  effectiveFrom?: Date;
}) {
  const batch = await prisma.employeeImportBatch.findUniqueOrThrow({
    where: { id: input.batchId },
    include: { rows: { orderBy: { rowNumber: "asc" } } },
  });
  if (batch.status !== "PREVIEWED") throw new Error("Import batch is not awaiting confirmation");

  const companies = await listImportableCompanies({
    userId: input.actorUserId,
    globalRole: input.globalRole,
  });
  const authorizedIds = new Set(companies.map((c) => c.id));

  const decisions = new Map(input.decisions.map((decision) => [decision.rowNumber, decision]));
  if (decisions.size !== input.decisions.length) throw new Error("Duplicate row decisions are not allowed");
  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const row of batch.rows) {
    const decision = decisions.get(row.rowNumber);
    if (!decision || decision.action === "skip") {
      await prisma.employeeImportRow.update({ where: { id: row.id }, data: { status: "SKIPPED" } });
      skippedCount += 1;
      continue;
    }
    if (row.status === "ERROR") {
      errorCount += 1;
      continue;
    }
    if (decision.action === "update" && !decision.employeeId) {
      await prisma.employeeImportRow.update({
        where: { id: row.id },
        data: { status: "ERROR", errorsJson: ["employeeId is required for update"] },
      });
      errorCount += 1;
      continue;
    }

    // Re-run the same resolver used in preview against authorised companies.
    const [parsed] = parseEmployeeCsv(
      `${EMPLOYEE_IMPORT_HEADERS.join(",")}\n${EMPLOYEE_IMPORT_HEADERS.map((header) => {
        const value = String((row.rawJson as CsvRecord)[header] ?? "");
        return `"${value.replace(/"/g, '""')}"`;
      }).join(",")}`,
      companies,
    );

    if (!parsed.data) {
      await prisma.employeeImportRow.update({
        where: { id: row.id },
        data: { status: "ERROR", errorsJson: parsed.errors },
      });
      errorCount += 1;
      continue;
    }

    // Preview and confirm must agree on the resolved company ID.
    if (row.resolvedCompanyId && row.resolvedCompanyId !== parsed.data.companyId) {
      await prisma.employeeImportRow.update({
        where: { id: row.id },
        data: {
          status: "ERROR",
          errorsJson: [
            `Resolved company changed between preview (${row.resolvedCompanyId}) and confirm (${parsed.data.companyId})`,
          ],
        },
      });
      errorCount += 1;
      continue;
    }

    if (!authorizedIds.has(parsed.data.companyId)) {
      await prisma.employeeImportRow.update({
        where: { id: row.id },
        data: { status: "ERROR", errorsJson: ["Not authorised to import into this company"] },
      });
      errorCount += 1;
      continue;
    }

    if (decision.action === "create") {
      const existing = await prisma.employee.findMany({
        where: { companyId: parsed.data.companyId },
        select: { id: true, displayName: true },
      });
      const duplicates = existing.filter(
        (candidate) =>
          normalizeCompanyName(candidate.displayName) ===
          normalizeCompanyName(parsed.data!.displayName),
      );
      if (duplicates.length) {
        await prisma.employeeImportRow.update({
          where: { id: row.id },
          data: {
            status: "ERROR",
            errorsJson: [
              "An employee with this name already exists in this company. Choose Update existing or Skip — create will not invent a duplicate.",
            ],
          },
        });
        errorCount += 1;
        continue;
      }
    }

    try {
      const employee = await employeeFacade.createFromImport({
        actorUserId: input.actorUserId,
        employeeId: decision.action === "update" ? decision.employeeId : undefined,
        ...parsed.data,
        effectiveFrom: input.effectiveFrom,
      });
      const status = decision.action === "update" ? "UPDATED" : "CREATED";
      await prisma.employeeImportRow.update({
        where: { id: row.id },
        data: {
          status,
          employeeId: employee.id,
          resolvedCompanyId: parsed.data.companyId,
          parsedJson: {
            ...parsed.data,
            dateOfJoining: parsed.data.dateOfJoining.toISOString(),
          },
        },
      });
      if (status === "UPDATED") updatedCount += 1;
      else createdCount += 1;
    } catch (error) {
      await prisma.employeeImportRow.update({
        where: { id: row.id },
        data: {
          status: "ERROR",
          errorsJson: [error instanceof Error ? error.message : "Import failed"],
        },
      });
      errorCount += 1;
    }
  }

  const summary = { createdCount, updatedCount, skippedCount, errorCount };
  await prisma.employeeImportBatch.update({
    where: { id: batch.id },
    data: {
      status: errorCount && !createdCount && !updatedCount ? "FAILED" : "COMMITTED",
      effectiveFrom: input.effectiveFrom,
      ...summary,
      summaryJson: summary,
    },
  });
  return { batchId: batch.id, ...summary };
}

/** Folder + file naming for payslips and profit sheets (S3 keys). */

function slugPart(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 40) || "UNKNOWN";
}

export function periodKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function employeeFolderName(input: {
  employeeCode: string;
  firstName: string;
  lastName: string;
}): string {
  return `${input.employeeCode}_${slugPart(input.lastName)}_${slugPart(input.firstName)}`;
}

/** payslips/{NW}/{NW-0001_Yadav_Dheeraj}/{2026-08}/ */
export function payslipFolderPrefix(input: {
  companyPrefix: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  year: number;
  month: number;
}): string {
  const folder = employeeFolderName(input);
  return `payslips/${input.companyPrefix}/${folder}/${periodKey(input.year, input.month)}`;
}

export function payslipPdfFileName(input: {
  employeeCode: string;
  year: number;
  month: number;
  version: number;
}): string {
  return `Payslip_${input.employeeCode}_${periodKey(input.year, input.month)}_v${input.version}.pdf`;
}

export function payslipCalcFileName(input: {
  employeeCode: string;
  year: number;
  month: number;
  version: number;
}): string {
  return `Calc_${input.employeeCode}_${periodKey(input.year, input.month)}_v${input.version}.json`;
}

/** profit/{NQ}/{2026-09}/ */
export function profitFolderPrefix(input: {
  companyPrefix: string;
  year: number;
  month: number;
}): string {
  return `profit/${input.companyPrefix}/${periodKey(input.year, input.month)}`;
}

export function profitSheetFileName(input: {
  companyPrefix: string;
  year: number;
  month: number;
}): string {
  return `Profit_Sheet_${input.companyPrefix}_${periodKey(input.year, input.month)}.json`;
}

export type PayslipFolderNode = {
  employeeKey: string;
  employeeCode: string;
  employeeName: string;
  months: Array<{
    period: string;
    year: number;
    month: number;
    slips: Array<{
      id: string;
      status: string;
      verificationCode: string;
      version: number;
      pathLabel: string;
    }>;
  }>;
};

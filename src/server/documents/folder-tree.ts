import { employeeFolderName, periodKey } from "@/server/documents/naming";

export type FolderSlip = {
  id: string;
  status: string;
  verificationCode: string;
  currentVersion: number;
  employeeCode: string;
  employeeName: string;
  companyPrefix: string;
  year: number;
  month: number;
};

export function groupPayslipsAsFolders(slips: FolderSlip[]) {
  const byEmployee = new Map<
    string,
    {
      employeeKey: string;
      employeeCode: string;
      employeeName: string;
      companyPrefix: string;
      months: Map<
        string,
        {
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
        }
      >;
    }
  >();

  for (const s of slips) {
    const [firstName, ...rest] = s.employeeName.split(" ");
    const lastName = rest.join(" ") || firstName;
    const employeeKey = employeeFolderName({
      employeeCode: s.employeeCode,
      firstName,
      lastName,
    });
    if (!byEmployee.has(employeeKey)) {
      byEmployee.set(employeeKey, {
        employeeKey,
        employeeCode: s.employeeCode,
        employeeName: s.employeeName,
        companyPrefix: s.companyPrefix,
        months: new Map(),
      });
    }
    const emp = byEmployee.get(employeeKey)!;
    const period = periodKey(s.year, s.month);
    if (!emp.months.has(period)) {
      emp.months.set(period, { period, year: s.year, month: s.month, slips: [] });
    }
    emp.months.get(period)!.slips.push({
      id: s.id,
      status: s.status,
      verificationCode: s.verificationCode,
      version: s.currentVersion,
      pathLabel: `payslips/${s.companyPrefix}/${employeeKey}/${period}/Payslip_${s.employeeCode}_${period}_v${s.currentVersion}.pdf`,
    });
  }

  return [...byEmployee.values()]
    .map((e) => ({
      ...e,
      months: [...e.months.values()].sort((a, b) => b.period.localeCompare(a.period)),
    }))
    .sort((a, b) => a.employeeCode.localeCompare(b.employeeCode));
}

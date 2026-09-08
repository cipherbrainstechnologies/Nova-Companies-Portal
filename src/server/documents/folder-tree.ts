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

/** Indian assessment year label for a calendar salary month (Apr–Mar FY). */
export function assessmentYearLabel(year: number, month: number): string {
  const start = month >= 4 ? year : year - 1;
  return `AY ${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

export function assessmentYearSortKey(year: number, month: number): number {
  return month >= 4 ? year : year - 1;
}

export function groupPayslipsAsFolders(slips: FolderSlip[]) {
  const byEmployee = new Map<
    string,
    {
      employeeKey: string;
      employeeCode: string;
      employeeName: string;
      companyPrefix: string;
      assessmentYears: Map<
        string,
        {
          label: string;
          sortKey: number;
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
        assessmentYears: new Map(),
      });
    }
    const emp = byEmployee.get(employeeKey)!;
    const ayLabel = assessmentYearLabel(s.year, s.month);
    const ayKey = String(assessmentYearSortKey(s.year, s.month));
    if (!emp.assessmentYears.has(ayKey)) {
      emp.assessmentYears.set(ayKey, {
        label: ayLabel,
        sortKey: assessmentYearSortKey(s.year, s.month),
        months: new Map(),
      });
    }
    const ay = emp.assessmentYears.get(ayKey)!;
    const period = periodKey(s.year, s.month);
    if (!ay.months.has(period)) {
      ay.months.set(period, { period, year: s.year, month: s.month, slips: [] });
    }
    ay.months.get(period)!.slips.push({
      id: s.id,
      status: s.status,
      verificationCode: s.verificationCode,
      version: s.currentVersion,
      pathLabel: `payslips/${s.companyPrefix}/${employeeKey}/${ayLabel}/${period}/Payslip_${s.employeeCode}_${period}_v${s.currentVersion}.pdf`,
    });
  }

  return [...byEmployee.values()]
    .map((e) => ({
      employeeKey: e.employeeKey,
      employeeCode: e.employeeCode,
      employeeName: e.employeeName,
      companyPrefix: e.companyPrefix,
      // Back-compat flat months for older callers
      months: [...e.assessmentYears.values()]
        .flatMap((ay) => [...ay.months.values()])
        .sort((a, b) => b.period.localeCompare(a.period)),
      assessmentYears: [...e.assessmentYears.values()]
        .sort((a, b) => b.sortKey - a.sortKey)
        .map((ay) => ({
          label: ay.label,
          months: [...ay.months.values()].sort((a, b) => b.period.localeCompare(a.period)),
        })),
    }))
    .sort((a, b) => a.employeeCode.localeCompare(b.employeeCode));
}

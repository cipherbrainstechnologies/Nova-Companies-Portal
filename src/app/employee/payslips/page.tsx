import { requirePageUser } from "@/server/auth/page-guard";
import { prisma } from "@/server/db";
import { EmployeeShell } from "@/components/admin-shell";
import { groupPayslipsAsFolders } from "@/server/documents/folder-tree";
import { PayslipFolderBrowser } from "@/components/payslip-folder-browser";
import { t } from "@/i18n";

export default async function EmployeePayslipsPage() {
  const locale = "en" as const;
  const user = await requirePageUser(["EMPLOYEE"]);
  const employee = user.employeeId
    ? await prisma.employee.findUnique({ where: { id: user.employeeId } })
    : null;
  const slips = user.employeeId
    ? await prisma.payslip.findMany({
        where: { employeeId: user.employeeId, status: "ISSUED" },
        include: { payrollRun: true, company: true, employee: true },
        orderBy: { issuedAt: "desc" },
      })
    : [];

  const tree = groupPayslipsAsFolders(
    slips.map((s) => ({
      id: s.id,
      status: s.status,
      verificationCode: s.verificationCode,
      currentVersion: s.currentVersion,
      employeeCode: s.employee.employeeCode,
      employeeName: `${s.employee.firstName} ${s.employee.lastName}`,
      companyPrefix: s.company.prefix,
      year: s.payrollRun.year,
      month: s.payrollRun.month,
    })),
  );

  const name = employee ? `${employee.firstName} ${employee.lastName}` : undefined;

  return (
    <EmployeeShell
      title={t(locale, "employee.payslips")}
      description={t(locale, "employee.payslipFolderHelp")}
      employeeName={name}
    >
      <PayslipFolderBrowser tree={tree} allowDownload />
    </EmployeeShell>
  );
}

import Link from "next/link";
import { requirePageUser } from "@/server/auth/page-guard";
import { prisma } from "@/server/db";
import { Button } from "@/components/ui";
import { PublicChrome, BracketLabel, Meta } from "@/components/industrial";
import { groupPayslipsAsFolders } from "@/server/documents/folder-tree";
import { PayslipFolderBrowser } from "@/components/payslip-folder-browser";
import { t } from "@/i18n";

export default async function EmployeePayslipsPage() {
  const locale = "en" as const;
  const user = await requirePageUser(["EMPLOYEE"]);
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

  return (
    <PublicChrome
      brand={t(locale, "brand")}
      right={
        <Link href="/employee/dashboard">
          <Button variant="ghost" className="min-h-12">
            {t(locale, "employee.dashboard")}
          </Button>
        </Link>
      }
    >
      <BracketLabel>EMPLOYEE / SALARY FOLDER</BracketLabel>
      <h1 className="h-macro mt-2 text-[clamp(2rem,6vw,3.75rem)]">
        {t(locale, "employee.payslips")}
      </h1>
      <Meta className="mt-3 block normal-case tracking-[0.04em] text-[var(--muted)]">
        {t(locale, "employee.payslipFolderHelp")}
      </Meta>
      <hr className="rule-accent mb-6 mt-4" />
      <PayslipFolderBrowser tree={tree} allowDownload />
    </PublicChrome>
  );
}

import { prisma } from "@/server/db";
import { groupPayslipsAsFolders } from "@/server/documents/folder-tree";
import { PayslipFolderBrowser } from "@/components/payslip-folder-browser";
import { AlertBanner } from "@/components/industrial";
import { t } from "@/i18n";

export default async function CompanyPayslipsPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const slips = await prisma.payslip.findMany({
    where: { companyId },
    include: { employee: true, payrollRun: true, company: true },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

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
    <div>
      <div className="mb-4">
        <AlertBanner tone="info">{t("en", "admin.payslipFolderHelp")}</AlertBanner>
      </div>
      <PayslipFolderBrowser tree={tree} allowDownload />
    </div>
  );
}

import { requirePageUser } from "@/server/auth/page-guard";
import { AdminShell } from "@/components/admin-shell";
import { prisma } from "@/server/db";
import { groupPayslipsAsFolders } from "@/server/documents/folder-tree";
import { PayslipFolderBrowser } from "@/components/payslip-folder-browser";
import { AlertBanner } from "@/components/industrial";
import { t } from "@/i18n";

export default async function PayslipsAdminPage() {
  const user = await requirePageUser(["SUPER_ADMIN", "OPERATIONS_MANAGER"]);
  const slips = await prisma.payslip.findMany({
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
    <AdminShell
      title={t("en", "admin.payslips")}
      description="Browse issued and in-progress payslips by company and employee folder. Downloads use the secured API."
      userName={user.email ?? user.phone}
      userRole={user.globalRole}
    >
      <div className="mb-4">
        <AlertBanner tone="info">{t("en", "admin.payslipFolderHelp")}</AlertBanner>
      </div>
      <PayslipFolderBrowser tree={tree} allowDownload />
    </AdminShell>
  );
}

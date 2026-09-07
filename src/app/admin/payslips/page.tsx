import { requirePageUser } from "@/server/auth/page-guard";
import { AdminShell } from "@/components/admin-shell";
import { prisma } from "@/server/db";
import { groupPayslipsAsFolders } from "@/server/documents/folder-tree";
import { PayslipFolderBrowser } from "@/components/payslip-folder-browser";
import { Meta } from "@/components/industrial";
import { t } from "@/i18n";

export default async function PayslipsAdminPage() {
  await requirePageUser(["SUPER_ADMIN", "OPERATIONS_MANAGER"]);
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
    <AdminShell title={t("en", "admin.payslips")} kicker="DOCUMENTS / FOLDER TREE">
      <div className="mb-4 border-2 border-[var(--ink)] bg-[var(--bg-alt)] p-4">
        <Meta className="normal-case tracking-[0.04em] text-[var(--muted)]">
          {t("en", "admin.payslipFolderHelp")}
        </Meta>
      </div>
      <PayslipFolderBrowser tree={tree} allowDownload />
    </AdminShell>
  );
}

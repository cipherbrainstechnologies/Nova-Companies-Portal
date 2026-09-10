import { prisma } from "@/server/db";
import { groupPayslipsAsFolders } from "@/server/documents/folder-tree";
import { PayslipFolderBrowser } from "@/components/payslip-folder-browser";
import { AlertBanner } from "@/components/industrial";
import { t } from "@/i18n";
import { requireSessionUser } from "@/server/auth/session";
import { requirePermission } from "@/server/rbac/permissions";
import { GenerateSalarySlipsPanel } from "./generate-panel";

async function can(
  user: Awaited<ReturnType<typeof requireSessionUser>>,
  companyId: string,
  module: Parameters<typeof requirePermission>[0]["module"],
  action: Parameters<typeof requirePermission>[0]["action"],
) {
  try {
    await requirePermission({ user, companyId, module, action });
    return true;
  } catch {
    return false;
  }
}

export default async function CompanyPayslipsPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const user = await requireSessionUser();
  const [canCreatePayroll, canDownloadPayslips] = await Promise.all([
    can(user, companyId, "payroll", "create"),
    can(user, companyId, "payslips", "download"),
  ]);

  const slips = await prisma.payslip.findMany({
    where: { companyId },
    include: { employee: true, payrollRun: true, company: true },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const issuedGroups = await prisma.payslip.groupBy({
    by: ["payrollRunId"],
    where: { companyId, status: "ISSUED" },
    _count: { _all: true },
  });
  const runIds = issuedGroups.map((g) => g.payrollRunId);
  const runs = runIds.length
    ? await prisma.payrollRun.findMany({
        where: { id: { in: runIds } },
        select: { id: true, year: true, month: true },
      })
    : [];
  const runById = new Map(runs.map((r) => [r.id, r]));
  const issuedByPeriod = issuedGroups
    .map((g) => {
      const run = runById.get(g.payrollRunId);
      if (!run) return null;
      return { year: run.year, month: run.month, count: g._count._all };
    })
    .filter((row): row is { year: number; month: number; count: number } => row != null);

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
      <GenerateSalarySlipsPanel
        companyId={companyId}
        canCreatePayroll={canCreatePayroll}
        canDownloadPayslips={canDownloadPayslips}
        issuedByPeriod={issuedByPeriod}
      />
      <div className="mb-4">
        <AlertBanner tone="info">{t("en", "admin.payslipFolderHelp")}</AlertBanner>
      </div>
      <PayslipFolderBrowser tree={tree} allowDownload={canDownloadPayslips} />
    </div>
  );
}

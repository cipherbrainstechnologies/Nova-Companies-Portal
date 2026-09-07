import { prisma } from "@/server/db";
import { DataRow, StatusBadge, EmptyState } from "@/components/industrial";
import { t } from "@/i18n";
import { CreatePayrollForm } from "@/app/admin/payroll/create-form";
import { ApprovalSummary } from "@/app/admin/payroll/approval-summary";

export default async function CompanyPayrollPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const runs = await prisma.payrollRun.findMany({
    where: { companyId },
    include: { _count: { select: { lines: true } } },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  return (
    <div>
      <div className="mb-6">
        <ApprovalSummary companyId={companyId} />
      </div>
      <CreatePayrollForm companyId={companyId} />
      <div className="mt-6 grid gap-3">
        {runs.map((r) => (
          <DataRow
            key={r.id}
            title={`${String(r.month).padStart(2, "0")}/${r.year}`}
            subtitle={`${r._count.lines} employee lines · progress tracked by line status`}
            action={<StatusBadge status={r.status} tone="info" />}
          />
        ))}
        {!runs.length ? (
          <EmptyState
            title={t("en", "company.hub.noPayroll")}
            description={t("en", "company.hub.noPayrollBody")}
          />
        ) : null}
      </div>
    </div>
  );
}

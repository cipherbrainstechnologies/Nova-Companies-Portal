import Link from "next/link";
import { requirePageUser } from "@/server/auth/page-guard";
import { companyFacade } from "@/server/facades/company-facade";
import { AdminShell } from "@/components/admin-shell";
import { Card } from "@/components/ui";
import { StatusBadge, BracketLabel } from "@/components/industrial";
import { t } from "@/i18n";
import { prisma } from "@/server/db";

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "employees", label: "Employees", href: (id: string) => `/admin/employees?companyId=${id}` },
  { id: "templates", label: "Salary Template", href: () => `/admin/templates` },
  { id: "statements", label: "Statements", href: (id: string) => `/admin/statements?companyId=${id}` },
  { id: "payroll", label: "Payroll", href: (id: string) => `/admin/payroll?companyId=${id}` },
  { id: "tds", label: "TDS", href: () => `/admin/tds` },
  { id: "finance", label: "Finance", href: () => `/admin/finance` },
] as const;

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const user = await requirePageUser(["SUPER_ADMIN", "OPERATIONS_MANAGER"]);
  const { companyId } = await params;
  const company = await companyFacade.getCompany(companyId);
  const [employeeCount, latestRun, latestStatement] = await Promise.all([
    prisma.employee.count({ where: { companyId, status: "ACTIVE" } }),
    prisma.payrollRun.findFirst({
      where: { companyId },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    }),
    prisma.bankStatement.findFirst({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <AdminShell
      title={company.name}
      description="Company profile, payroll context, and shortcuts into related modules."
      userName={user.email ?? user.phone}
      userRole={user.globalRole}
    >
      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const href = "href" in tab && tab.href ? tab.href(companyId) : undefined;
          if (!href) {
            return (
              <span
                key={tab.id}
                className="rounded-full bg-[var(--nova-teal)] px-3.5 py-2 text-sm font-medium text-white"
              >
                {tab.label}
              </span>
            );
          }
          return (
            <Link
              key={tab.id}
              href={href}
              className="rounded-full border border-[var(--nova-border)] bg-[var(--nova-surface)] px-3.5 py-2 text-sm font-medium text-[var(--nova-text-secondary)] hover:border-[var(--nova-teal)] hover:text-[var(--nova-teal)]"
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-[var(--nova-radius)] bg-[var(--nova-teal-soft)] text-lg font-bold text-[var(--nova-teal)]">
            {company.prefix}
          </div>
          <div>
            <BracketLabel>Legal entity</BracketLabel>
            <div className="mt-1 text-lg font-semibold text-[var(--nova-ink)]">{company.name}</div>
          </div>
          <div className="ml-auto">
            <StatusBadge
              status={company.isActive ? t("en", "admin.active") : t("en", "admin.inactive")}
              tone={company.isActive ? "success" : "neutral"}
            />
          </div>
        </div>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--nova-muted)]">
              {t("en", "admin.prefix")}
            </dt>
            <dd className="mt-1 text-base font-semibold">{company.prefix}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--nova-muted)]">
              {t("en", "admin.gstin")}
            </dt>
            <dd className="mt-1 text-base font-medium">{company.gstin ?? t("en", "common.needsConfig")}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--nova-muted)]">
              Active employees
            </dt>
            <dd className="mt-1 text-base font-semibold tabular-nums">{employeeCount}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--nova-muted)]">
              {t("en", "admin.address")}
            </dt>
            <dd className="mt-1 text-sm text-[var(--nova-text-secondary)]">
              {company.address ?? t("en", "common.needsConfig")}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--nova-muted)]">
              Latest payroll
            </dt>
            <dd className="mt-1 text-sm">
              {latestRun
                ? `${String(latestRun.month).padStart(2, "0")}/${latestRun.year} · ${latestRun.status}`
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--nova-muted)]">
              Last statement
            </dt>
            <dd className="mt-1 text-sm">
              {latestStatement
                ? `${latestStatement.createdAt.toLocaleDateString()} · ${latestStatement.status}`
                : "—"}
            </dd>
          </div>
        </dl>
      </Card>
    </AdminShell>
  );
}

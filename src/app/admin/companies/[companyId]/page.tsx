import { companyFacade } from "@/server/facades/company-facade";
import { Card } from "@/components/ui";
import { StatusBadge, BracketLabel } from "@/components/industrial";
import { t } from "@/i18n";
import { prisma } from "@/server/db";
import Link from "next/link";
import { AutomationSettingsForm } from "@/app/admin/companies/automation-settings-form";
import { EditCompanyButton } from "@/app/admin/companies/edit-company-form";

const quickLinks = [
  { segment: "employees", key: "admin.employees" },
  { segment: "templates", key: "admin.templates" },
  { segment: "statements", key: "admin.statements" },
  { segment: "payroll", key: "admin.payroll" },
  { segment: "payslips", key: "admin.payslips" },
  { segment: "tds", key: "admin.tds" },
  { segment: "finance", key: "admin.finance" },
] as const;

export default async function CompanyOverviewPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
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
    <div className="space-y-6">
      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-[var(--nova-radius)] bg-[var(--nova-teal-soft)] text-lg font-bold text-[var(--nova-teal)]">
            {company.prefix}
          </div>
          <div className="min-w-0 flex-1">
            <BracketLabel>{t("en", "company.hub.legalEntity")}</BracketLabel>
            <div className="mt-1 text-lg font-semibold text-[var(--nova-ink)]">{company.name}</div>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <StatusBadge
              status={company.isActive ? t("en", "admin.active") : t("en", "admin.inactive")}
              tone={company.isActive ? "success" : "neutral"}
            />
            <EditCompanyButton
              company={{
                id: company.id,
                name: company.name,
                gstin: company.gstin,
                address: company.address,
                email: company.email,
                phone: company.phone,
              }}
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
              Company email
            </dt>
            <dd className="mt-1 text-base font-medium">
              {company.email ?? t("en", "common.needsConfig")}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--nova-muted)]">
              Company phone
            </dt>
            <dd className="mt-1 text-base font-medium">
              {company.phone ?? t("en", "common.needsConfig")}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--nova-muted)]">
              {t("en", "admin.gstin")}
            </dt>
            <dd className="mt-1 text-base font-medium">
              {company.gstin ?? t("en", "common.needsConfig")}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--nova-muted)]">
              {t("en", "company.hub.activeEmployees")}
            </dt>
            <dd className="mt-1 text-base font-semibold tabular-nums">
              <Link
                href={`/admin/companies/${companyId}/employees`}
                className="text-[var(--nova-teal)] hover:underline"
              >
                {employeeCount}
              </Link>
            </dd>
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
              {t("en", "company.hub.latestPayroll")}
            </dt>
            <dd className="mt-1 text-sm">
              {latestRun
                ? `${String(latestRun.month).padStart(2, "0")}/${latestRun.year} · ${latestRun.status}`
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--nova-muted)]">
              {t("en", "company.hub.lastStatement")}
            </dt>
            <dd className="mt-1 text-sm">
              {latestStatement
                ? `${latestStatement.createdAt.toLocaleDateString()} · ${latestStatement.status}`
                : "—"}
            </dd>
          </div>
        </dl>
      </Card>

      <AutomationSettingsForm
        companyId={companyId}
        autoIssueExactMatches={company.autoIssueExactMatches}
        emailDeliveryPreference={company.emailDeliveryPreference}
        matchScoreThreshold={company.matchScoreThreshold}
      />

      <div>
        <BracketLabel>{t("en", "company.hub.modules")}</BracketLabel>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((link) => (
            <Link
              key={link.segment}
              href={`/admin/companies/${companyId}/${link.segment}`}
              className="rounded-[var(--nova-radius)] border border-[var(--nova-border)] bg-[var(--nova-surface)] p-4 shadow-[var(--nova-shadow)] transition-colors hover:border-[var(--nova-teal)]"
            >
              <div className="font-semibold text-[var(--nova-ink)]">{t("en", link.key)}</div>
              <p className="mt-1 text-sm text-[var(--nova-muted)]">
                {t("en", "company.hub.openModule")}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

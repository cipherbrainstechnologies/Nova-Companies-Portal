"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

const MODULE_TABS = [
  { segment: "", key: "company.hub.overview" },
  { segment: "employees", key: "admin.employees" },
  { segment: "templates", key: "admin.templates" },
  { segment: "statements", key: "admin.statements" },
  { segment: "payroll", key: "admin.payroll" },
  { segment: "payslips", key: "admin.payslips" },
  { segment: "tds", key: "admin.tds" },
  { segment: "finance", key: "admin.finance" },
] as const;

function moduleFromPath(pathname: string, companyId: string): string {
  const base = `/admin/companies/${companyId}`;
  if (pathname === base || pathname === `${base}/`) return "";
  const rest = pathname.slice(base.length + 1);
  return rest.split("/")[0] ?? "";
}

function sectionLabelFor(segment: string): string | null {
  const tab = MODULE_TABS.find((t) => t.segment === segment);
  if (!tab || tab.segment === "") return null;
  return t("en", tab.key);
}

export function CompanyHub({
  companyId,
  companyName,
  companies,
  children,
}: {
  companyId: string;
  companyName: string;
  companies?: Array<{ id: string; name: string; prefix?: string }>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const activeSegment = moduleFromPath(pathname, companyId);
  const sectionLabel = sectionLabelFor(activeSegment);

  function hrefFor(segment: string) {
    const base = `/admin/companies/${companyId}`;
    return segment ? `${base}/${segment}` : base;
  }

  function onSwitchCompany(nextId: string) {
    if (!nextId || nextId === companyId) return;
    const base = `/admin/companies/${nextId}`;
    router.push(activeSegment ? `${base}/${activeSegment}` : base);
  }

  return (
    <div>
      <nav
        aria-label={t("en", "company.hub.breadcrumb")}
        className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-[var(--nova-muted)]"
      >
        <Link
          href="/admin/companies"
          className="font-medium text-[var(--nova-teal)] hover:underline"
        >
          {t("en", "admin.companies")}
        </Link>
        <span aria-hidden className="text-[var(--nova-border-strong)]">
          /
        </span>
        <Link
          href={`/admin/companies/${companyId}`}
          className={cn(
            "font-medium",
            sectionLabel
              ? "text-[var(--nova-teal)] hover:underline"
              : "text-[var(--nova-ink)]",
          )}
        >
          {companyName}
        </Link>
        {sectionLabel ? (
          <>
            <span aria-hidden className="text-[var(--nova-border-strong)]">
              /
            </span>
            <span className="font-medium text-[var(--nova-ink)]">{sectionLabel}</span>
          </>
        ) : null}
      </nav>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/companies"
          className="text-sm font-semibold text-[var(--nova-teal)] hover:underline"
        >
          ← {t("en", "company.hub.backToCompanies")}
        </Link>
        {companies && companies.length > 1 ? (
          <label className="flex items-center gap-2 text-sm text-[var(--nova-text-secondary)]">
            <span className="font-medium">{t("en", "company.hub.switchCompany")}</span>
            <select
              className="min-h-10 rounded-[var(--nova-radius-sm)] border border-[var(--nova-border)] bg-[var(--nova-surface)] px-3 text-sm font-medium text-[var(--nova-ink)]"
              value={companyId}
              onChange={(e) => onSwitchCompany(e.target.value)}
              aria-label={t("en", "company.hub.switchCompany")}
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.prefix ? `${c.prefix} · ` : ""}
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <div className="sticky top-[3.25rem] z-20 -mx-1 mb-6 border-b border-[var(--nova-border)] bg-[var(--nova-canvas)]/95 px-1 py-2 backdrop-blur md:top-[3.5rem]">
        <div
          className="flex gap-1 overflow-x-auto pb-1"
          role="tablist"
          aria-label={t("en", "company.hub.modules")}
        >
          {MODULE_TABS.map((tab) => {
            const active = activeSegment === tab.segment;
            return (
              <Link
                key={tab.segment || "overview"}
                href={hrefFor(tab.segment)}
                role="tab"
                aria-selected={active}
                className={cn(
                  "shrink-0 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors",
                  active
                    ? "border-[var(--nova-teal)] bg-[var(--nova-teal)] text-white"
                    : "border-[var(--nova-border)] bg-[var(--nova-surface)] text-[var(--nova-text-secondary)] hover:border-[var(--nova-teal)] hover:text-[var(--nova-teal)]",
                )}
              >
                {t("en", tab.key)}
              </Link>
            );
          })}
        </div>
      </div>

      {children}
    </div>
  );
}

"use client";

import Link from "next/link";
import { t } from "@/i18n";
import { HazardBar, BracketLabel, UnitStamp } from "@/components/industrial";

const links = [
  { href: "/admin/dashboard", key: "admin.dashboard", code: "01" },
  { href: "/admin/companies", key: "admin.companies", code: "02" },
  { href: "/admin/employees", key: "admin.employees", code: "03" },
  { href: "/admin/templates", key: "admin.templates", code: "04" },
  { href: "/admin/statements", key: "admin.statements", code: "05" },
  { href: "/admin/payroll", key: "admin.payroll", code: "06" },
  { href: "/admin/payslips", key: "admin.payslips", code: "07" },
  { href: "/admin/tds", key: "admin.tds", code: "08" },
  { href: "/admin/finance", key: "admin.finance", code: "09" },
  { href: "/admin/users-permissions", key: "admin.users", code: "10" },
  { href: "/admin/audit-logs", key: "admin.audit", code: "11" },
] as const;

export function AdminShell({
  title,
  children,
  kicker,
}: {
  title: string;
  children: React.ReactNode;
  kicker?: string;
}) {
  return (
    <div className="min-h-screen">
      <HazardBar />
      <div className="md:grid md:grid-cols-[220px_1fr]">
        <aside className="border-b-2 border-[var(--ink)] bg-[var(--bg-alt)] md:min-h-screen md:border-b-0 md:border-r-2">
          <div className="border-b-2 border-[var(--ink)] p-4">
            <div className="h-display text-lg leading-none">{t("en", "brand")}</div>
            <div className="mt-2">
              <UnitStamp unit="OPS" />
            </div>
          </div>
          <nav className="flex flex-col">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="meta flex min-h-12 items-center gap-2 border-b border-[var(--ink)] px-4 py-3 hover:bg-[var(--bg)] hover:text-[var(--accent)]"
              >
                <span className="text-[var(--accent)]">{l.code}</span>
                <span>{t("en", l.key)}</span>
              </Link>
            ))}
            <button
              type="button"
              className="meta min-h-12 border-b border-[var(--ink)] px-4 py-3 text-left text-[var(--muted)] hover:text-[var(--accent)]"
              onClick={() => {
                void fetch("/api/auth/logout", { method: "POST" }).then(() => {
                  window.location.href = "/login";
                });
              }}
            >
              {'/// '} {t("en", "common.logout")}
            </button>
          </nav>
        </aside>
        <main className="p-4 md:p-8">
          <div className="mb-2 flex items-center justify-between">
            <BracketLabel>{kicker ?? "ADMIN / CONTROL"}</BracketLabel>
            <span className="meta text-[var(--accent)]">LIVE</span>
          </div>
          <h1 className="h-macro mb-2 text-[clamp(2rem,5vw,3.75rem)]">{title}</h1>
          <hr className="rule-accent mb-6" />
          {children}
        </main>
      </div>
    </div>
  );
}

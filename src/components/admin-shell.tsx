"use client";

import Link from "next/link";
import { t } from "@/i18n";

const links = [
  { href: "/admin/dashboard", key: "admin.dashboard" },
  { href: "/admin/companies", key: "admin.companies" },
  { href: "/admin/employees", key: "admin.employees" },
  { href: "/admin/templates", key: "admin.templates" },
  { href: "/admin/statements", key: "admin.statements" },
  { href: "/admin/payroll", key: "admin.payroll" },
  { href: "/admin/payslips", key: "admin.payslips" },
  { href: "/admin/tds", key: "admin.tds" },
  { href: "/admin/finance", key: "admin.finance" },
  { href: "/admin/users-permissions", key: "admin.users" },
  { href: "/admin/audit-logs", key: "admin.audit" },
] as const;

export function AdminShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside className="border-r border-[var(--line)] bg-[var(--paper-soft)] p-4">
        <div className="h-display mb-6 text-lg font-bold">{t("en", "brand")}</div>
        <nav className="flex flex-col gap-1 text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md px-3 py-2 hover:bg-[var(--paper)]"
            >
              {t("en", l.key)}
            </Link>
          ))}
          <button
            type="button"
            className="mt-4 rounded-md px-3 py-2 text-left text-[var(--muted)] hover:bg-[var(--paper)]"
            onClick={() => {
              void fetch("/api/auth/logout", { method: "POST" }).then(() => {
                window.location.href = "/login";
              });
            }}
          >
            {t("en", "common.logout")}
          </button>
        </nav>
      </aside>
      <main className="p-6 md:p-8">
        <h1 className="h-display mb-6 text-3xl font-bold">{title}</h1>
        {children}
      </main>
    </div>
  );
}

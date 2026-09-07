"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { t } from "@/i18n";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin/dashboard", key: "admin.dashboard", group: "Overview" },
  { href: "/admin/companies", key: "admin.companies", group: "Organization" },
  { href: "/admin/employees", key: "admin.employees", group: "Organization" },
  { href: "/admin/templates", key: "admin.templates", group: "Organization" },
  { href: "/admin/statements", key: "admin.statements", group: "Payroll" },
  { href: "/admin/payroll", key: "admin.payroll", group: "Payroll" },
  { href: "/admin/payslips", key: "admin.payslips", group: "Payroll" },
  { href: "/admin/tds", key: "admin.tds", group: "Finance" },
  { href: "/admin/finance", key: "admin.finance", group: "Finance" },
  { href: "/admin/users-permissions", key: "admin.users", group: "Security" },
  { href: "/admin/audit-logs", key: "admin.audit", group: "Security" },
] as const;

function roleLabel(role?: string) {
  if (role === "SUPER_ADMIN") return "Super Admin";
  if (role === "OPERATIONS_MANAGER") return "Operations Manager";
  return role ?? "Admin";
}

async function logout() {
  await fetch("/api/auth/logout", { method: "POST" });
  window.location.href = "/login";
}

function NavLinks({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  let lastGroup = "";
  return (
    <nav className="flex flex-col gap-0.5 px-2 pb-4" aria-label="Admin">
      {links.map((l) => {
        const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
        const showGroup = l.group !== lastGroup;
        lastGroup = l.group;
        return (
          <div key={l.href}>
            {showGroup ? (
              <div className="px-3 pb-1 pt-4 text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-[var(--nova-muted)]">
                {l.group}
              </div>
            ) : null}
            <Link
              href={l.href}
              onClick={onNavigate}
              className={cn(
                "flex min-h-10 items-center rounded-[var(--nova-radius-sm)] px-3 text-sm font-medium transition-colors",
                active
                  ? "bg-[var(--nova-teal-soft)] text-[var(--nova-teal)]"
                  : "text-[var(--nova-text-secondary)] hover:bg-[var(--nova-surface-muted)] hover:text-[var(--nova-ink)]",
              )}
            >
              {t("en", l.key)}
            </Link>
          </div>
        );
      })}
    </nav>
  );
}

export function AdminShell({
  title,
  children,
  kicker,
  description,
  actions,
  userName,
  userRole,
}: {
  title: string;
  children: React.ReactNode;
  kicker?: string;
  description?: string;
  actions?: React.ReactNode;
  userName?: string;
  userRole?: string;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const sidebar = (
    <>
      <div className="border-b border-[var(--nova-border)] px-4 py-5">
        <Link href="/admin/dashboard" className="block">
          <div className="h-display text-lg text-[var(--nova-ink)]">{t("en", "brand")}</div>
          <p className="mt-1 text-xs text-[var(--nova-muted)]">Operations console</p>
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto">
        <NavLinks pathname={pathname} onNavigate={() => setMobileOpen(false)} />
      </div>
      <div className="border-t border-[var(--nova-border)] p-3">
        <div className="rounded-[var(--nova-radius-sm)] bg-[var(--nova-surface-muted)] px-3 py-2.5">
          <div className="truncate text-sm font-semibold text-[var(--nova-ink)]">
            {userName ?? "Signed in"}
          </div>
          <div className="text-xs text-[var(--nova-muted)]">{roleLabel(userRole)}</div>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen md:grid md:grid-cols-[260px_1fr]">
      <aside className="hidden border-r border-[var(--nova-border)] bg-[var(--nova-surface)] md:flex md:min-h-screen md:flex-col">
        {sidebar}
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-[var(--nova-ink)]/40"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 flex h-full w-[min(88vw,280px)] flex-col bg-[var(--nova-surface)] shadow-[var(--nova-shadow-md)]">
            {sidebar}
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[var(--nova-border)] bg-[var(--nova-surface)]/95 px-4 py-3 backdrop-blur md:px-8">
          <button
            type="button"
            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-[var(--nova-radius-sm)] border border-[var(--nova-border)] md:hidden"
            aria-label="Open navigation"
            onClick={() => setMobileOpen(true)}
          >
            <span aria-hidden className="text-lg leading-none">
              ☰
            </span>
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-[var(--nova-muted)]">
              {kicker ?? "Admin"}
            </p>
            <p className="truncate text-sm font-semibold text-[var(--nova-ink)]">{title}</p>
          </div>
          <div className="relative">
            <button
              type="button"
              className="flex min-h-10 items-center gap-2 rounded-full border border-[var(--nova-border)] bg-[var(--nova-surface)] px-2.5 py-1.5 text-left hover:border-[var(--nova-teal)]"
              aria-expanded={profileOpen}
              aria-haspopup="menu"
              onClick={() => setProfileOpen((v) => !v)}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--nova-teal-soft)] text-xs font-bold text-[var(--nova-teal)]">
                {(userName ?? "A").slice(0, 1).toUpperCase()}
              </span>
              <span className="hidden text-xs font-semibold text-[var(--nova-ink)] sm:inline">
                {roleLabel(userRole)}
              </span>
            </button>
            {profileOpen ? (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-56 rounded-[var(--nova-radius)] border border-[var(--nova-border)] bg-[var(--nova-surface)] p-2 shadow-[var(--nova-shadow-md)]"
              >
                <div className="border-b border-[var(--nova-border)] px-2 pb-2 mb-2">
                  <div className="text-sm font-semibold">{userName ?? "Admin"}</div>
                  <div className="text-xs text-[var(--nova-muted)]">{roleLabel(userRole)}</div>
                </div>
                <button
                  type="button"
                  role="menuitem"
                  className="w-full rounded-[var(--nova-radius-sm)] px-2 py-2 text-left text-sm text-[var(--nova-danger)] hover:bg-[var(--nova-danger-soft)]"
                  onClick={() => void logout()}
                >
                  {t("en", "common.logout")}
                </button>
              </div>
            ) : null}
          </div>
        </header>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="h-macro text-[clamp(1.6rem,2.5vw,2rem)]">{title}</h1>
              {description ? (
                <p className="mt-1.5 max-w-2xl text-sm text-[var(--nova-text-secondary)]">
                  {description}
                </p>
              ) : kicker ? (
                <p className="mt-1 text-sm text-[var(--nova-muted)]">{kicker}</p>
              ) : null}
            </div>
            {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

export function EmployeeShell({
  title,
  description,
  children,
  employeeName,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  employeeName?: string;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const nav = [
    { href: "/employee/dashboard", label: t("en", "employee.dashboard") },
    { href: "/employee/payslips", label: t("en", "employee.payslips") },
  ];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-[var(--nova-border)] bg-[var(--nova-surface)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 md:px-6">
          <div className="min-w-0 flex-1">
            <div className="h-display text-base text-[var(--nova-ink)]">{t("en", "brand")}</div>
            <p className="truncate text-xs text-[var(--nova-muted)]">
              Employee portal{employeeName ? ` · ${employeeName}` : ""}
            </p>
          </div>
          <nav className="hidden items-center gap-1 sm:flex">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-full px-3 py-2 text-sm font-medium",
                  pathname === item.href
                    ? "bg-[var(--nova-teal-soft)] text-[var(--nova-teal)]"
                    : "text-[var(--nova-text-secondary)] hover:bg-[var(--nova-surface-muted)]",
                )}
              >
                {item.label}
              </Link>
            ))}
            <Button variant="ghost" size="sm" onClick={() => void logout()}>
              {t("en", "common.logout")}
            </Button>
          </nav>
          <button
            type="button"
            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-[var(--nova-radius-sm)] border border-[var(--nova-border)] sm:hidden"
            aria-label="Menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            ☰
          </button>
        </div>
        {menuOpen ? (
          <div className="border-t border-[var(--nova-border)] px-4 py-3 sm:hidden">
            <div className="flex flex-col gap-1">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-[var(--nova-radius-sm)] px-3 py-2.5 text-sm font-medium"
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <button
                type="button"
                className="rounded-[var(--nova-radius-sm)] px-3 py-2.5 text-left text-sm font-medium text-[var(--nova-danger)]"
                onClick={() => void logout()}
              >
                {t("en", "common.logout")}
              </button>
            </div>
          </div>
        ) : null}
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8">
        <div className="mb-6">
          <h1 className="h-macro text-[clamp(1.6rem,3vw,2rem)]">{title}</h1>
          {description ? (
            <p className="mt-1.5 text-sm text-[var(--nova-text-secondary)]">{description}</p>
          ) : null}
        </div>
        {children}
      </main>
    </div>
  );
}

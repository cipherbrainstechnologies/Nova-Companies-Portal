"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "overview", label: "Overview" },
  { href: "onboarding", label: "Onboarding" },
  { href: "team", label: "Employees" },
  { href: "payroll", label: "Payroll" },
  { href: "costs", label: "Costs" },
  { href: "invoices", label: "Invoices" },
  { href: "documents", label: "Documents" },
  { href: "approvals", label: "Approvals" },
  { href: "people", label: "Team access" },
  { href: "support", label: "Support" },
  { href: "activity", label: "Activity" },
] as const;

async function logout() {
  await fetch("/api/auth/logout", { method: "POST" });
  window.location.href = "/login/client";
}

export function ClientShell({
  clientSlug,
  clientName,
  children,
  banner,
}: {
  clientSlug: string;
  clientName: string;
  children: React.ReactNode;
  banner?: React.ReactNode;
}) {
  const pathname = usePathname();
  const base = `/client/${clientSlug}`;

  return (
    <div className="min-h-screen bg-[var(--nova-canvas)] text-[var(--nova-ink)]">
      <header className="border-b border-[var(--nova-border)] bg-[var(--nova-surface)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--nova-teal)]">NOVA Client</p>
            <h1 className="text-lg font-bold">{clientName}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="text-sm text-[var(--nova-muted)] hover:text-[var(--nova-teal)]">
              Help
            </Link>
            <Button type="button" variant="ghost" size="sm" onClick={() => logout()}>
              Sign out
            </Button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 pb-2" aria-label="Client">
          {NAV.map((item) => {
            const href = `${base}/${item.href}`;
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={item.href}
                href={href}
                className={cn(
                  "whitespace-nowrap rounded-[var(--nova-radius-sm)] px-3 py-2 text-sm font-medium",
                  active
                    ? "bg-[var(--nova-teal-soft)] text-[var(--nova-teal)]"
                    : "text-[var(--nova-text-secondary)] hover:bg-[var(--nova-surface-muted)]",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        {banner}
        {children}
      </main>
    </div>
  );
}

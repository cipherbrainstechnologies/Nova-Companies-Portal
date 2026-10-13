"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const GROUPS = [
  {
    label: "Overview",
    items: [{ href: "overview", label: "Dashboard" }],
  },
  {
    label: "People",
    items: [
      { href: "team", label: "Employees" },
      { href: "onboarding", label: "Company onboarding" },
      { href: "approvals", label: "Approvals" },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "payroll", label: "Payroll" },
      { href: "costs", label: "Costs" },
      { href: "invoices", label: "Invoices" },
    ],
  },
  {
    label: "Company",
    items: [
      { href: "documents", label: "Documents" },
      { href: "people", label: "Team access" },
    ],
  },
  {
    label: "Support",
    items: [
      { href: "support", label: "Help" },
      { href: "activity", label: "Activity" },
    ],
  },
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
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div data-client-portal="true" className="min-h-[100dvh] bg-[#f5f6fd] text-[#171727]">
      <div className="lg:grid lg:grid-cols-[auto_minmax(0,1fr)]">
        <aside
          className={cn(
            "sticky top-0 hidden h-[100dvh] flex-col bg-[#0C0C32] text-white lg:flex",
            collapsed ? "w-[4.5rem]" : "w-64",
          )}
        >
          <div className="flex items-center justify-between gap-2 px-4 py-5">
            <Link href={`${base}/overview`} className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">Nova</p>
              {collapsed ? null : <p className="truncate text-sm font-bold">Workforce</p>}
            </Link>
            <button
              type="button"
              className="rounded-md px-2 py-1 text-xs text-white/70 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              aria-expanded={!collapsed}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={() => setCollapsed((value) => !value)}
            >
              {collapsed ? ">" : "<"}
            </button>
          </div>
          <SidebarNav base={base} pathname={pathname} collapsed={collapsed} />
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-30 border-b border-[#e5e7ef] bg-white">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center rounded-full border border-[#e5e7ef] px-3 text-sm font-semibold lg:hidden"
                  aria-expanded={open}
                  aria-controls="client-menu"
                  onClick={() => setOpen((value) => !value)}
                >
                  {open ? "Close" : "Menu"}
                </button>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#697084]">Client</p>
                  <h1 className="truncate text-base font-bold">{clientName}</h1>
                </div>
              </div>
              <button
                type="button"
                className="inline-flex min-h-11 items-center rounded-full bg-[#5857F5] px-4 text-sm font-semibold text-white hover:bg-[#4846DF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5857F5]"
                onClick={() => logout()}
              >
                Sign out
              </button>
            </div>
          </header>

          {open ? (
            <nav id="client-menu" className="border-b border-[#e5e7ef] bg-white px-4 py-3 lg:hidden" aria-label="Client">
              <SidebarNav base={base} pathname={pathname} collapsed={false} light />
            </nav>
          ) : null}

          <main className="mx-auto max-w-6xl px-4 py-6">
            {banner}
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

function SidebarNav({
  base,
  pathname,
  collapsed,
  light,
}: {
  base: string;
  pathname: string;
  collapsed: boolean;
  light?: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 pb-6">
      {GROUPS.map((group) => (
        <div key={group.label}>
          {collapsed ? null : (
            <p className={cn("px-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.12em]", light ? "text-[#697084]" : "text-white/45")}>
              {group.label}
            </p>
          )}
          <ul className="space-y-1">
            {group.items.map((item) => {
              const href = `${base}/${item.href}`;
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    title={item.label}
                    className={cn(
                      "flex min-h-11 items-center rounded-xl px-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
                      light
                        ? active
                          ? "bg-[#EDEEFF] text-[#0C0C32] focus-visible:outline-[#5857F5]"
                          : "text-[#171727] hover:bg-[#f5f6fd] focus-visible:outline-[#5857F5]"
                        : active
                          ? "bg-white text-[#0C0C32] focus-visible:outline-white"
                          : "text-white/80 hover:bg-white/10 focus-visible:outline-white",
                    )}
                  >
                    {collapsed ? item.label.slice(0, 1) : item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

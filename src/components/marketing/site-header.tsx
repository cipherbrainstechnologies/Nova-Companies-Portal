"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SiteCopy } from "@/content/public-site";

const links: Array<{ href: string; key: keyof SiteCopy["nav"] }> = [
  { href: "/companies", key: "companies" },
  { href: "/services", key: "services" },
  { href: "/how-we-work", key: "how" },
  { href: "/pricing", key: "pricing" },
  { href: "/faq", key: "faq" },
];

export function SiteHeader({ copy }: { copy: SiteCopy }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [path]);

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--nova-border)] bg-[color-mix(in_srgb,var(--nova-canvas)_92%,white)] backdrop-blur">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-40 focus:rounded focus:bg-white focus:px-3 focus:py-2"
      >
        {copy.nav.skip}
      </a>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-6">
        <Link href="/" className="h-display min-w-0 text-xl text-[var(--nova-ink)] hover:text-[var(--nova-ink)]">
          {copy.meta.siteName}
        </Link>
        <nav className="hidden items-center gap-5 lg:flex" aria-label={copy.nav.label}>
          {links.map((item) => {
            const active = path === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "text-sm font-semibold text-[var(--nova-teal)] hover:text-[var(--nova-teal)]"
                    : "text-sm font-medium text-[var(--nova-text-secondary)] hover:text-[var(--nova-teal)]"
                }
              >
                {copy.nav[item.key]}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden min-h-10 items-center rounded-[var(--nova-radius-sm)] border border-[var(--nova-border-strong)] bg-[var(--nova-surface)] px-3 text-sm font-semibold text-[var(--nova-text)] hover:border-[var(--nova-teal)] hover:text-[var(--nova-teal)] sm:inline-flex"
          >
            {copy.nav.login}
          </Link>
          <Link
            href="/contact"
            className="inline-flex min-h-10 items-center rounded-[var(--nova-radius-sm)] bg-[var(--nova-teal)] px-3 text-sm font-semibold text-white hover:bg-[#0d5f58] hover:text-white"
          >
            {copy.nav.contact}
          </Link>
          <button
            type="button"
            className="inline-flex min-h-10 items-center rounded-[var(--nova-radius-sm)] border border-[var(--nova-border)] px-3 text-sm font-semibold lg:hidden"
            aria-expanded={open}
            aria-controls="site-menu"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? copy.nav.close : copy.nav.menu}
          </button>
        </div>
      </div>
      {open ? (
        <nav id="site-menu" aria-label={copy.nav.label} className="border-t border-[var(--nova-border)] lg:hidden">
          <ul className="mx-auto flex max-w-6xl flex-col px-4 py-2 md:px-6">
            {links.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block py-3 text-base font-medium text-[var(--nova-ink)] hover:text-[var(--nova-teal)]"
                  aria-current={path === item.href ? "page" : undefined}
                >
                  {copy.nav[item.key]}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/about" className="block py-3 text-base font-medium">
                {copy.nav.about}
              </Link>
            </li>
            <li>
              <Link href="/login" className="block py-3 text-base font-semibold text-[var(--nova-teal)]">
                {copy.nav.login}
              </Link>
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  );
}

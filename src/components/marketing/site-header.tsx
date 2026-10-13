"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SiteCopy } from "@/content/public-site";

export function SiteHeader({ copy }: { copy: SiteCopy }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const servicesRef = useRef<HTMLDivElement>(null);
  const resourcesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
    setServicesOpen(false);
    setResourcesOpen(false);
  }, [path]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setServicesOpen(false);
        setResourcesOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      const t = event.target as Node;
      if (servicesRef.current && !servicesRef.current.contains(t)) setServicesOpen(false);
      if (resourcesRef.current && !resourcesRef.current.contains(t)) setResourcesOpen(false);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const navLink =
    "text-sm font-medium text-[var(--mkt-text)] hover:text-[var(--mkt-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mkt-accent)]";

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--mkt-border)] bg-white/95 backdrop-blur-md">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">
        {copy.nav.skip}
      </a>
      <div className="mkt-container flex items-center justify-between gap-3 py-3.5">
        <Link href="/" className="text-lg font-bold tracking-tight text-[var(--mkt-text)]">
          {copy.meta.siteName}
        </Link>

        <nav className="hidden items-center gap-6 xl:flex" aria-label={copy.nav.label}>
          <Dropdown
            ref={servicesRef}
            label={copy.nav.services}
            open={servicesOpen}
            setOpen={setServicesOpen}
            items={copy.nav.serviceLinks}
          />
          <Link href="/how-it-works" className={navLink} aria-current={path === "/how-it-works" ? "page" : undefined}>
            {copy.nav.howItWorks}
          </Link>
          <Link href="/#why-nova" className={navLink}>{copy.nav.whyNova}</Link>
          <Link href="/pricing" className={navLink} aria-current={path === "/pricing" ? "page" : undefined}>
            {copy.nav.pricingQuote}
          </Link>
          <Dropdown
            ref={resourcesRef}
            label={copy.nav.resources}
            open={resourcesOpen}
            setOpen={setResourcesOpen}
            items={copy.nav.resourceLinks}
          />
          <Link href="/contact" className={navLink} aria-current={path === "/contact" ? "page" : undefined}>
            {copy.nav.contact}
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login/client"
            className="hidden min-h-10 items-center rounded-[var(--mkt-radius-pill)] px-3 text-sm font-semibold text-[var(--mkt-text-secondary)] hover:text-[var(--mkt-accent)] md:inline-flex"
          >
            {copy.nav.clientLogin}
          </Link>
          <Link
            href="/contact"
            className="inline-flex min-h-10 items-center rounded-[var(--mkt-radius-pill)] bg-[var(--mkt-accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--mkt-accent-hover)]"
          >
            {copy.nav.talkExpert}
          </Link>
          <button
            type="button"
            className="inline-flex min-h-10 items-center rounded-[var(--mkt-radius-pill)] border border-[var(--mkt-border)] px-3 text-sm font-semibold xl:hidden"
            aria-expanded={open}
            aria-controls="site-menu"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? copy.nav.close : copy.nav.menu}
          </button>
        </div>
      </div>

      {open ? (
        <nav id="site-menu" className="border-t border-[var(--mkt-border)] xl:hidden" aria-label={copy.nav.label}>
          <ul className="mkt-container flex flex-col py-2">
            <MobileGroup title={copy.nav.services} items={copy.nav.serviceLinks} onNavigate={() => setOpen(false)} />
            <li><MobileLink href="/how-it-works" label={copy.nav.howItWorks} onNavigate={() => setOpen(false)} /></li>
            <li><MobileLink href="/#why-nova" label={copy.nav.whyNova} onNavigate={() => setOpen(false)} /></li>
            <li><MobileLink href="/pricing" label={copy.nav.pricingQuote} onNavigate={() => setOpen(false)} /></li>
            <MobileGroup title={copy.nav.resources} items={copy.nav.resourceLinks} onNavigate={() => setOpen(false)} />
            <li><MobileLink href="/contact" label={copy.nav.contact} onNavigate={() => setOpen(false)} /></li>
            <li><MobileLink href="/login/client" label={copy.nav.clientLogin} onNavigate={() => setOpen(false)} accent /></li>
          </ul>
        </nav>
      ) : null}
    </header>
  );
}

function Dropdown({
  label,
  items,
  open,
  setOpen,
  ref,
}: {
  label: string;
  items: Array<{ href: string; label: string }>;
  open: boolean;
  setOpen: (v: boolean) => void;
  ref: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="inline-flex items-center gap-1 text-sm font-medium text-[var(--mkt-text)] hover:text-[var(--mkt-accent)]"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen(!open)}
      >
        {label}
        <span aria-hidden className="text-xs">▾</span>
      </button>
      {open ? (
        <ul
          className="absolute left-0 top-full z-50 mt-2 min-w-[14rem] rounded-[var(--mkt-radius)] border border-[var(--mkt-border)] bg-white py-2 shadow-[var(--mkt-shadow)]"
          role="menu"
        >
          {items.map((item) => (
            <li key={item.href} role="none">
              <Link
                href={item.href}
                role="menuitem"
                className="block px-4 py-2.5 text-sm text-[var(--mkt-text)] hover:bg-[var(--mkt-soft-bg)]"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function MobileLink({ href, label, onNavigate, accent }: { href: string; label: string; onNavigate: () => void; accent?: boolean }) {
  return (
    <Link
      href={href}
      className={`block py-3 text-base ${accent ? "font-semibold text-[var(--mkt-accent)]" : "font-medium text-[var(--mkt-text)]"}`}
      onClick={onNavigate}
    >
      {label}
    </Link>
  );
}

function MobileGroup({
  title,
  items,
  onNavigate,
}: {
  title: string;
  items: Array<{ href: string; label: string }>;
  onNavigate: () => void;
}) {
  return (
    <li className="border-b border-[var(--mkt-border)] py-2">
      <p className="py-2 text-xs font-semibold uppercase tracking-wide text-[var(--mkt-text-secondary)]">{title}</p>
      {items.map((item) => (
        <Link key={item.href} href={item.href} className="block py-2 pl-2 text-base text-[var(--mkt-text)]" onClick={onNavigate}>
          {item.label}
        </Link>
      ))}
    </li>
  );
}

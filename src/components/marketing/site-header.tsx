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
    "text-[15px] font-medium text-[var(--nova-text)] hover:text-[var(--nova-purple)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--nova-purple)]";

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--nova-border)] bg-white">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">
        {copy.nav.skip}
      </a>
      <div className="mkt-container relative flex h-16 items-center justify-between gap-3 lg:h-20">
        <Link href="/" className="relative z-10 flex items-center gap-2.5 text-[var(--nova-text)]">
          <NovaMark />
          <span className="whitespace-nowrap text-[15px] font-bold tracking-tight sm:text-[17px]">{copy.meta.siteName}</span>
        </Link>

        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-7 xl:flex" aria-label={copy.nav.label}>
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

        <div className="relative z-10 flex items-center gap-2">
          <Link
            href="/login/client"
            className="hidden min-h-11 items-center rounded-[var(--mkt-radius-pill)] px-3 text-[15px] font-semibold text-[var(--nova-text)] hover:text-[var(--nova-purple)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--nova-purple)] lg:inline-flex"
          >
            {copy.nav.clientLogin}
          </Link>
          <Link
            href="/contact"
            className="mkt-btn-on-dark inline-flex min-h-11 items-center whitespace-nowrap rounded-[var(--mkt-radius-pill)] bg-[var(--nova-purple)] px-3 text-[13px] font-semibold text-white hover:bg-[var(--nova-purple-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--nova-purple)] sm:px-4 sm:text-[15px]"
          >
            {copy.nav.talkExpert}
          </Link>
          <button
            type="button"
            className="inline-flex min-h-11 items-center rounded-[var(--mkt-radius-pill)] border border-[var(--nova-border)] px-2.5 text-sm font-semibold text-[var(--nova-text)] sm:px-3 xl:hidden"
            aria-expanded={open}
            aria-controls="site-menu"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? copy.nav.close : copy.nav.menu}
          </button>
        </div>
      </div>

      {open ? (
        <nav id="site-menu" className="border-t border-[var(--nova-border)] bg-white xl:hidden" aria-label={copy.nav.label}>
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

function NovaMark() {
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--nova-navy)] text-[15px] font-bold text-white" aria-hidden>
      N
    </span>
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
        className="inline-flex min-h-11 items-center gap-1 text-[15px] font-medium text-[var(--nova-text)] hover:text-[var(--nova-purple)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--nova-purple)]"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen(!open)}
      >
        {label}
        <span aria-hidden className="text-xs">▾</span>
      </button>
      {open ? (
        <ul
          className="absolute left-0 top-full z-50 mt-2 min-w-[16rem] rounded-2xl border border-[var(--nova-border)] bg-white py-2 shadow-[var(--mkt-shadow)]"
          role="menu"
        >
          {items.map((item) => (
            <li key={item.href} role="none">
              <Link
                href={item.href}
                role="menuitem"
                className="block px-4 py-2.5 text-[15px] text-[var(--nova-text)] hover:bg-[var(--nova-surface-soft)]"
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
      className={`block min-h-12 py-3 text-base ${accent ? "font-semibold text-[var(--nova-purple)]" : "font-medium text-[var(--nova-text)]"}`}
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
    <li className="border-b border-[var(--nova-border)] py-2">
      <p className="py-2 text-xs font-semibold uppercase tracking-wide text-[var(--nova-muted)]">{title}</p>
      {items.map((item) => (
        <Link key={item.href} href={item.href} className="block min-h-11 py-2 pl-2 text-base text-[var(--nova-text)]" onClick={onNavigate}>
          {item.label}
        </Link>
      ))}
    </li>
  );
}

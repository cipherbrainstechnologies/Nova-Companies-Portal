import Link from "next/link";
import type { Locale } from "@/i18n";
import { getSiteCopy } from "@/content/public-site";
import { SiteHeader } from "@/components/marketing/site-header";
import { MobileQuoteBar } from "@/components/marketing/mobile-quote-bar";

export function SiteShell({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const copy = getSiteCopy(locale);
  const explore = [
    ["/employer-of-record-india", copy.nav.whyNova],
    ["/how-it-works", copy.nav.howItWorks],
    ["/pricing", copy.nav.pricing],
    ["/platform", copy.nav.platform],
    ["/compliance", copy.nav.compliance],
    ["/security", "Security"],
    ["/fx-transparency", "FX transparency"],
    ["/faq", copy.nav.faq],
    ["/contact", copy.nav.contact],
    ["/privacy", copy.nav.privacy],
    ["/terms", "Terms"],
    ["/cookies", "Cookies"],
  ] as const;

  return (
    <div className="min-h-screen" data-marketing="true">
      <div className="h-1 w-full bg-gradient-to-r from-[var(--nova-ink)] via-[var(--nova-teal)] to-[var(--nova-teal-soft)]" aria-hidden />
      <SiteHeader copy={copy} />
      <main id="main" tabIndex={-1} className="mx-auto max-w-7xl px-4 py-10 outline-none md:px-6 md:py-14">
        {children}
      </main>
      <MobileQuoteBar label={copy.nav.getQuote} />
      <footer className="border-t border-[var(--nova-border)] bg-[var(--mkt-surface)] pb-20 md:pb-0">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-[1.3fr_1fr_1fr] md:px-6">
          <div>
            <p className="h-display text-xl text-[var(--nova-ink)]">{copy.meta.siteName}</p>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-[var(--nova-text-secondary)]">{copy.footer.blurb}</p>
            <p className="mt-3 text-xs leading-relaxed text-[var(--nova-muted)]">{copy.footer.legalEntity}</p>
            <p className="mt-4 text-sm">
              <span className="text-[var(--nova-muted)]">{copy.footer.contactLabel} </span>
              <a className="font-semibold text-[var(--nova-teal)]" href={`mailto:${copy.footer.email}`}>
                {copy.footer.email}
              </a>
            </p>
          </div>
          <nav aria-label={copy.footer.explore}>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--nova-muted)]">{copy.footer.explore}</p>
            <ul className="mt-3 space-y-2">
              {explore.map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-[var(--nova-text-secondary)] hover:text-[var(--nova-teal)]">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label={copy.footer.portal}>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--nova-muted)]">{copy.footer.portal}</p>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href="/login/client" className="text-sm font-semibold text-[var(--nova-teal)] hover:text-[var(--nova-teal)]">
                  {copy.footer.client}
                </Link>
              </li>
              <li>
                <Link href="/login/employee" className="text-sm text-[var(--nova-text-secondary)] hover:text-[var(--nova-teal)]">
                  {copy.footer.employee}
                </Link>
              </li>
              <li>
                <Link href="/login/admin" className="text-sm text-[var(--nova-text-secondary)] hover:text-[var(--nova-teal)]">
                  {copy.footer.admin}
                </Link>
              </li>
            </ul>
          </nav>
        </div>
        <div className="border-t border-[var(--nova-border)]">
          <p className="mx-auto max-w-7xl px-4 py-4 text-xs text-[var(--nova-muted)] md:px-6">
            © {new Date().getFullYear()} {copy.footer.rights}
          </p>
        </div>
      </footer>
    </div>
  );
}

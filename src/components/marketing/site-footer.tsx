import Link from "next/link";
import type { SiteCopy } from "@/content/public-site";

export function SiteFooter({ copy }: { copy: SiteCopy }) {
  const services = copy.footer.columns.services;
  const company = copy.footer.columns.company;
  const resources = copy.footer.columns.resources;

  return (
    <footer className="border-t border-white/10 bg-[var(--mkt-dark)] text-white">
      <div className="mkt-container grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <p className="text-xl font-bold">{copy.meta.siteName}</p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/75">{copy.footer.blurb}</p>
          <p className="mt-4 text-sm">
            <a className="font-semibold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white" href={`mailto:${copy.footer.email}`}>
              {copy.footer.email}
            </a>
          </p>
        </div>
        <FooterCol title={copy.footer.servicesTitle} links={services} />
        <FooterCol title={copy.footer.companyTitle} links={company} />
        <FooterCol title={copy.footer.resourcesTitle} links={resources} />
      </div>
      <div className="border-t border-white/10">
        <div className="mkt-container flex flex-col gap-3 py-6 text-xs text-white/50 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} {copy.footer.rights}</p>
          <p className="max-w-xl leading-relaxed">{copy.footer.legalEntity}</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-white">{copy.nav.privacy}</Link>
            <Link href="/terms" className="hover:text-white">{copy.footer.terms}</Link>
            <Link href="/cookies" className="hover:text-white">{copy.footer.cookies}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: Array<{ href: string; label: string }> }) {
  return (
    <nav aria-label={title}>
      <p className="text-xs font-semibold uppercase tracking-wider text-white/45">{title}</p>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="text-sm text-white/80 hover:text-white">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

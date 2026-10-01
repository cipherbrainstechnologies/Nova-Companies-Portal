import type { Metadata } from "next";
import Link from "next/link";
import { ClosingBand, MarketingLink } from "@/components/marketing/blocks";
import { getSiteCopy } from "@/content/public-site";
import { getRequestLocale } from "@/content/request-locale";

export async function generateMetadata(): Promise<Metadata> {
  const copy = getSiteCopy(await getRequestLocale());
  return {
    title: { absolute: copy.home.metaTitle },
    description: copy.meta.description,
  };
}

export default async function HomePage() {
  const copy = getSiteCopy(await getRequestLocale());
  const home = copy.home;
  const previewServices = copy.services.items.slice(0, 3);
  const previewFaq = copy.faq.items.slice(0, 4);

  return (
    <>
      <section className="grid items-start gap-8 lg:grid-cols-[1.35fr_0.75fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--nova-teal)]">{home.kicker}</p>
          <h1 className="h-macro mt-4 max-w-3xl text-[clamp(2.4rem,6vw,4.2rem)]">{home.title}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-[var(--nova-text-secondary)]">{home.lede}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <MarketingLink href="/contact">{home.primary}</MarketingLink>
            <MarketingLink href="/login" variant="outline">
              {home.secondary}
            </MarketingLink>
          </div>
          <ul className="mt-6 flex flex-col gap-2 text-sm text-[var(--nova-text-secondary)] sm:flex-row sm:flex-wrap sm:gap-x-5">
            {home.assurances.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--nova-teal)]" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <aside className="rounded-[var(--nova-radius-lg)] bg-[var(--nova-ink)] p-6 text-white md:p-8">
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-white/60">{home.splitTitle}</h2>
          <ol className="mt-6 space-y-5">
            {home.split.map((item, index) => (
              <li key={item.title} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--nova-teal)] text-xs font-bold">
                  {index + 1}
                </span>
                <span>
                  <span className="block text-sm font-semibold">{item.title}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-white/80">{item.body}</span>
                </span>
              </li>
            ))}
          </ol>
        </aside>
      </section>

      <section className="mt-16" aria-labelledby="companies-heading">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="companies-heading" className="h-display text-[clamp(1.6rem,3vw,2.15rem)]">
              {home.companiesTitle}
            </h2>
            <p className="mt-2 max-w-2xl text-[var(--nova-text-secondary)]">{home.companiesLede}</p>
          </div>
          <Link href="/companies" className="text-sm font-semibold text-[var(--nova-teal)]">
            {copy.nav.companies}
          </Link>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {copy.companies.items.map((company) => (
            <article
              key={company.id}
              className="rounded-[var(--nova-radius-lg)] border border-[var(--nova-border)] bg-[var(--nova-surface)] p-6 shadow-[var(--nova-shadow)]"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--nova-teal)]">{company.role}</p>
              <h3 className="mt-2 text-2xl font-bold text-[var(--nova-ink)]">
                <Link href={`/companies#${company.id}`} className="hover:text-[var(--nova-teal)]">
                  {company.name}
                </Link>
              </h3>
              <p className="mt-1 text-sm text-[var(--nova-muted)]">{company.place}</p>
              <p className="mt-3 text-sm leading-relaxed text-[var(--nova-text-secondary)]">{company.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-16" aria-labelledby="services-heading">
        <h2 id="services-heading" className="h-display text-[clamp(1.6rem,3vw,2.15rem)]">
          {home.servicesTitle}
        </h2>
        <p className="mt-2 max-w-2xl text-[var(--nova-text-secondary)]">{home.servicesLede}</p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {previewServices.map((item) => (
            <article key={item.title} className="rounded-[var(--nova-radius)] border border-[var(--nova-border)] bg-[var(--nova-surface)] p-5">
              <h3 className="font-bold text-[var(--nova-ink)]">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--nova-text-secondary)]">{item.body}</p>
            </article>
          ))}
        </div>
        <p className="mt-4">
          <Link href="/services" className="text-sm font-semibold text-[var(--nova-teal)]">
            {copy.nav.services}
          </Link>
        </p>
      </section>

      <section className="mt-16" aria-labelledby="process-heading">
        <h2 id="process-heading" className="h-display text-[clamp(1.6rem,3vw,2.15rem)]">
          {home.processTitle}
        </h2>
        <p className="mt-2 max-w-2xl text-[var(--nova-text-secondary)]">{home.processLede}</p>
        <ol className="mt-6 grid gap-4 md:grid-cols-2">
          {copy.how.steps.map((step, index) => (
            <li key={step.title} className="rounded-[var(--nova-radius)] border border-[var(--nova-border)] bg-[var(--nova-surface)] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--nova-teal)]">
                {String(index + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-2 font-bold text-[var(--nova-ink)]">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--nova-text-secondary)]">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-16" aria-labelledby="compare-heading">
        <h2 id="compare-heading" className="h-display text-[clamp(1.6rem,3vw,2.15rem)]">
          {home.compareTitle}
        </h2>
        <p className="mt-2 max-w-2xl text-[var(--nova-text-secondary)]">{home.compareLede}</p>
        <div className="mt-6 overflow-x-auto rounded-[var(--nova-radius-lg)] border border-[var(--nova-border)] bg-[var(--nova-surface)]">
          <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
            <caption className="sr-only">{home.compareTitle}</caption>
            <thead>
              <tr className="border-b border-[var(--nova-border)] bg-[var(--nova-surface-muted)]">
                {home.compareColumns.map((column) => (
                  <th key={column || "aspect"} scope="col" className="px-4 py-3 font-semibold text-[var(--nova-ink)]">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {home.compareRows.map((row) => (
                <tr key={row.label} className="border-b border-[var(--nova-border)] last:border-0">
                  <th scope="row" className="px-4 py-3 font-semibold text-[var(--nova-ink)]">
                    {row.label}
                  </th>
                  {row.cells.map((cell, index) => (
                    <td key={`${row.label}-${index}`} className="px-4 py-3 text-[var(--nova-text-secondary)]">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-16" aria-labelledby="who-heading">
        <h2 id="who-heading" className="h-display text-[clamp(1.6rem,3vw,2.15rem)]">
          {home.whoTitle}
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {copy.who.items.map((item) => (
            <article key={item.title} className="rounded-[var(--nova-radius)] border border-[var(--nova-border)] bg-[var(--nova-surface)] p-5">
              <h3 className="font-bold text-[var(--nova-ink)]">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--nova-text-secondary)]">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-16" aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="h-display text-[clamp(1.6rem,3vw,2.15rem)]">
          {home.faqTitle}
        </h2>
        <div className="mt-6 divide-y divide-[var(--nova-border)] rounded-[var(--nova-radius-lg)] border border-[var(--nova-border)] bg-[var(--nova-surface)]">
          {previewFaq.map((item) => (
            <details key={item.q} className="group px-5 py-4">
              <summary className="cursor-pointer list-none font-semibold text-[var(--nova-ink)] [&::-webkit-details-marker]:hidden">
                <span className="flex items-start justify-between gap-4">
                  {item.q}
                  <span aria-hidden className="text-[var(--nova-teal)] group-open:hidden">
                    +
                  </span>
                  <span aria-hidden className="hidden text-[var(--nova-teal)] group-open:inline">
                    –
                  </span>
                </span>
              </summary>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[var(--nova-text-secondary)]">{item.a}</p>
            </details>
          ))}
        </div>
        <p className="mt-4">
          <Link href="/faq" className="text-sm font-semibold text-[var(--nova-teal)]">
            {copy.nav.faq}
          </Link>
        </p>
      </section>

      <ClosingBand title={home.ctaTitle} body={home.ctaBody} action={home.ctaAction} />
    </>
  );
}

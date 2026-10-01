import type { Metadata } from "next";
import { ClosingBand, PageIntro } from "@/components/marketing/blocks";
import { getSiteCopy } from "@/content/public-site";
import { getRequestLocale } from "@/content/request-locale";

export async function generateMetadata(): Promise<Metadata> {
  const copy = getSiteCopy(await getRequestLocale());
  return { title: copy.companies.metaTitle, description: copy.companies.lede };
}

export default async function CompaniesPage() {
  const page = getSiteCopy(await getRequestLocale()).companies;
  return (
    <>
      <PageIntro kicker={page.kicker} title={page.title} lede={page.lede} />
      <div className="mt-10 space-y-6">
        {page.items.map((company) => (
          <article
            id={company.id}
            key={company.id}
            className="scroll-mt-24 rounded-[var(--nova-radius-lg)] border border-[var(--nova-border)] bg-[var(--nova-surface)] p-6 md:p-8"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--nova-teal)]">{company.role}</p>
            <h2 className="h-display mt-2 text-3xl">{company.name}</h2>
            <p className="mt-1 text-sm text-[var(--nova-muted)]">{company.place}</p>
            <p className="mt-4 max-w-3xl leading-relaxed text-[var(--nova-text-secondary)]">{company.body}</p>
            <ul className="mt-5 grid gap-2 sm:grid-cols-3">
              {company.points.map((point) => (
                <li key={point} className="rounded-[var(--nova-radius)] bg-[var(--nova-surface-muted)] px-3 py-3 text-sm font-medium text-[var(--nova-ink)]">
                  {point}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      <ClosingBand title={page.ctaTitle} body={page.ctaBody} action={page.ctaAction} />
    </>
  );
}

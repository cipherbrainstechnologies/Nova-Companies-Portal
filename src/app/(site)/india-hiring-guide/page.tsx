import type { Metadata } from "next";
import { ClosingBand, MarketingLink, PageIntro } from "@/components/marketing/blocks";
import { getSiteCopy } from "@/content/public-site";
import { getRequestLocale } from "@/content/request-locale";

export async function generateMetadata(): Promise<Metadata> {
  const page = getSiteCopy(await getRequestLocale()).indiaHiringGuide;
  return { title: page.metaTitle, description: page.lede };
}

export default async function IndiaHiringGuidePage() {
  const copy = getSiteCopy(await getRequestLocale());
  const page = copy.indiaHiringGuide;

  return (
    <>
      <PageIntro kicker={page.kicker} title={page.title} lede={page.lede} />
      <p className="mt-4 max-w-3xl rounded-[var(--mkt-radius)] border border-[var(--mkt-border)] bg-[var(--nova-teal-soft)] px-4 py-3 text-sm text-[var(--nova-ink)]">
        {page.disclaimer}
      </p>
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {page.sections.map((section) => (
          <article
            key={section.title}
            className="rounded-[var(--mkt-radius)] border border-[var(--mkt-border)] bg-[var(--mkt-surface)] p-6"
          >
            <h2 className="text-lg font-bold text-[var(--nova-ink)]">{section.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--nova-text-secondary)]">{section.body}</p>
          </article>
        ))}
      </div>
      <div className="mt-10">
        <MarketingLink href="/employer-of-record-india" variant="outline">Employer of Record in India</MarketingLink>
      </div>
      <ClosingBand title={page.ctaTitle} action={page.ctaAction} href="/contact" />
    </>
  );
}

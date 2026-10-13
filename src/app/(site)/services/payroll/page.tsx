import type { Metadata } from "next";
import { ClosingBand, MarketingLink, PageIntro } from "@/components/marketing/blocks";
import { MarketingSection } from "@/components/marketing/section";
import { getSiteCopy } from "@/content/public-site";
import { getRequestLocale } from "@/content/request-locale";

export async function generateMetadata(): Promise<Metadata> {
  const page = getSiteCopy(await getRequestLocale()).payrollCompliance;
  return { title: page.metaTitle, description: page.lede };
}

export default async function PayrollCompliancePage() {
  const copy = getSiteCopy(await getRequestLocale());
  const page = copy.payrollCompliance;

  return (
    <>
      <PageIntro kicker={page.kicker} title={page.title} lede={page.lede} />
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <MarketingLink href="/contact">{page.ctaAction}</MarketingLink>
        <MarketingLink href="/pricing" variant="outline">Indicative cost estimate</MarketingLink>
      </div>

      <div className="mt-14 grid gap-6 md:grid-cols-3">
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

      <MarketingSection id="compliance" title={page.compliance.title}>
        <p className="text-sm leading-relaxed text-[var(--nova-text-secondary)]">{page.compliance.body}</p>
      </MarketingSection>

      <ClosingBand title={page.ctaTitle} action={page.ctaAction} href="/contact" />
    </>
  );
}

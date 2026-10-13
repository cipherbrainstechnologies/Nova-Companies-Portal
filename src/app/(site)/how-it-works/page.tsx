import type { Metadata } from "next";
import { ClosingBand, MarketingLink, PageIntro } from "@/components/marketing/blocks";
import { MarketingSection } from "@/components/marketing/section";
import { getSiteCopy } from "@/content/public-site";
import { getRequestLocale } from "@/content/request-locale";

export async function generateMetadata(): Promise<Metadata> {
  const page = getSiteCopy(await getRequestLocale()).howItWorksPage;
  return { title: page.metaTitle, description: page.lede };
}

export default async function HowItWorksPage() {
  const copy = getSiteCopy(await getRequestLocale());
  const page = copy.howItWorksPage;

  return (
    <>
      <PageIntro kicker={page.kicker} title={page.title} lede={page.lede} />
      <ol className="mt-10 space-y-4">
        {page.steps.map((step, index) => (
          <li
            key={step.id}
            id={step.id}
            className="rounded-[var(--mkt-radius)] border border-[var(--mkt-border)] bg-[var(--mkt-surface)] p-6"
          >
            <span className="text-sm font-bold text-[var(--nova-teal)]">Step {index + 1}</span>
            <h2 className="mt-2 text-xl font-bold text-[var(--nova-ink)]">{step.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--nova-text-secondary)]">{step.body}</p>
          </li>
        ))}
      </ol>

      <MarketingSection id="documentation" title={page.documentation.title}>
        <p className="text-sm leading-relaxed text-[var(--nova-text-secondary)]">{page.documentation.body}</p>
      </MarketingSection>

      <div className="mt-8">
        <MarketingLink href="/india-hiring-guide" variant="outline">{copy.nav.indiaGuide}</MarketingLink>
      </div>

      <ClosingBand title={page.ctaTitle} action={page.ctaAction} href="/contact" />
    </>
  );
}

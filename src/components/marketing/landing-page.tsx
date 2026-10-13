import { ClosingBand, MarketingLink, PageIntro } from "@/components/marketing/blocks";
import { MarketingSection } from "@/components/marketing/section";

export type LandingCopy = {
  metaTitle: string;
  kicker: string;
  title: string;
  lede: string;
  sections: Array<{ title: string; body: string }>;
  faq?: Array<{ q: string; a: string }>;
  ctaTitle: string;
  ctaAction: string;
  links?: Array<{ href: string; label: string }>;
};

export function MarketingLandingPage({ page }: { page: LandingCopy }) {
  return (
    <div className="mkt-container py-10 md:py-14">
      <PageIntro kicker={page.kicker} title={page.title} lede={page.lede} />
      <div className="mt-8 flex flex-wrap gap-3">
        <MarketingLink href="/contact">{page.ctaAction}</MarketingLink>
        {page.links?.map((link) => (
          <MarketingLink key={link.href} href={link.href} variant="outline">{link.label}</MarketingLink>
        ))}
      </div>
      <div className="mt-14 grid gap-6 md:grid-cols-2">
        {page.sections.map((section) => (
          <article key={section.title} className="rounded-[var(--mkt-radius)] bg-[var(--mkt-card)] p-6">
            <h2 className="text-lg font-bold">{section.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--mkt-text-secondary)]">{section.body}</p>
          </article>
        ))}
      </div>
      {page.faq?.length ? (
        <MarketingSection id="faq" title="Common questions" className="mt-16">
          <div className="divide-y divide-[var(--mkt-border)] rounded-[var(--mkt-radius-lg)] border border-[var(--mkt-border)] bg-white">
            {page.faq.map((item) => (
              <details key={item.q} className="group px-5 py-4">
                <summary className="cursor-pointer list-none font-semibold [&::-webkit-details-marker]:hidden">
                  <span className="flex justify-between gap-4">{item.q}<span className="text-[var(--mkt-accent)] group-open:hidden">+</span></span>
                </summary>
                <p className="mt-3 text-sm text-[var(--mkt-text-secondary)]">{item.a}</p>
              </details>
            ))}
          </div>
        </MarketingSection>
      ) : null}
      <ClosingBand title={page.ctaTitle} action={page.ctaAction} href="/contact" dark={false} />
    </div>
  );
}

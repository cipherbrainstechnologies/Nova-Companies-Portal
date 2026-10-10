import type { Metadata } from "next";
import Link from "next/link";
import { ClosingBand, MarketingLink } from "@/components/marketing/blocks";
import { CostDashboardPreview } from "@/components/marketing/home/cost-dashboard-preview";
import { EstimatorTeaser } from "@/components/marketing/home/estimator-teaser";
import { OnboardingTimeline } from "@/components/marketing/home/onboarding-timeline";
import { PortalTourTabs } from "@/components/marketing/home/portal-tour-tabs";
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
  const faqItems = copy.faq.items.filter((item) => home.faqIds.includes(item.id));

  return (
    <>
      <section className="grid items-start gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--nova-teal)]">{home.kicker}</p>
          <h1 className="h-macro mt-4 max-w-3xl text-balance text-[clamp(2.2rem,5.5vw,4rem)]">{home.title}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-[var(--nova-text-secondary)]">{home.lede}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <MarketingLink href="/pricing">{home.primary}</MarketingLink>
            <MarketingLink href="/contact" variant="outline">{home.secondary}</MarketingLink>
          </div>
          <p className="mt-4 text-sm text-[var(--nova-text-secondary)]">
            {home.clientSignIn}{" "}
            <Link href="/login/client" className="font-semibold text-[var(--nova-teal)]">
              {home.clientSignInLink}
            </Link>
          </p>
          <ul className="mt-6 flex flex-col gap-2 text-sm text-[var(--nova-text-secondary)] sm:flex-row sm:flex-wrap sm:gap-x-5">
            {home.assurances.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--nova-teal)]" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <aside
          id="differentiation"
          className="rounded-[var(--mkt-radius-lg)] border border-[var(--mkt-border)] bg-[var(--mkt-surface)] p-6 shadow-[var(--mkt-shadow)] md:p-8"
        >
          <h2 className="h-display text-xl text-[var(--nova-ink)]">{home.differentiation.title}</h2>
          <ul className="mt-6 space-y-5">
            {home.differentiation.items.map((item) => (
              <li key={item.title}>
                <h3 className="font-bold text-[var(--nova-ink)]">{item.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-[var(--nova-text-secondary)]">{item.body}</p>
              </li>
            ))}
          </ul>
        </aside>
      </section>

      <CostDashboardPreview copy={home.proof} />
      <EstimatorTeaser copy={home.estimator} />

      <section className="mt-16" aria-labelledby="control-heading">
        <h2 id="control-heading" className="h-display text-[clamp(1.6rem,3vw,2.15rem)]">
          {home.control.title}
        </h2>
        <p className="mt-2 max-w-2xl text-[var(--nova-text-secondary)]">{home.control.lede}</p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <article className="rounded-[var(--mkt-radius)] border border-[var(--mkt-border)] bg-[var(--mkt-surface)] p-6">
            <h3 className="font-bold text-[var(--nova-ink)]">{home.control.clientHeading}</h3>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-[var(--nova-text-secondary)]">
              {home.control.clientPoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </article>
          <article className="rounded-[var(--mkt-radius)] border border-[var(--mkt-border)] bg-[var(--mkt-surface)] p-6">
            <h3 className="font-bold text-[var(--nova-ink)]">{home.control.novaHeading}</h3>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-[var(--nova-text-secondary)]">
              {home.control.novaPoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </article>
        </div>
        <p className="mt-4 text-sm text-[var(--nova-muted)]">{home.control.footnote}</p>
      </section>

      <OnboardingTimeline copy={home.timeline} />
      <PortalTourTabs copy={home.portal} />

      <section className="mt-16" aria-labelledby="cost-explainer-heading">
        <h2 id="cost-explainer-heading" className="h-display text-[clamp(1.6rem,3vw,2.15rem)]">
          {home.costExplainer.title}
        </h2>
        <p className="mt-2 max-w-2xl text-[var(--nova-text-secondary)]">{home.costExplainer.body}</p>
        <ul className="mt-6 list-disc space-y-2 pl-5 text-sm text-[var(--nova-text-secondary)]">
          {home.costExplainer.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="mt-4">
          <Link href={home.costExplainer.methodologyHref} className="text-sm font-semibold text-[var(--nova-teal)]">
            {home.costExplainer.methodologyLink}
          </Link>
        </p>
      </section>

      <section className="mt-16" aria-labelledby="trust-heading">
        <h2 id="trust-heading" className="h-display text-[clamp(1.6rem,3vw,2.15rem)]">
          {home.trust.title}
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {home.trust.items.map((item) => (
            <article key={item.title} className="rounded-[var(--mkt-radius)] border border-[var(--mkt-border)] bg-[var(--mkt-surface)] p-5">
              <h3 className="font-bold text-[var(--nova-ink)]">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--nova-text-secondary)]">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-16 pb-8 md:pb-0" aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="h-display text-[clamp(1.6rem,3vw,2.15rem)]">
          {home.faqTitle}
        </h2>
        <div className="mt-6 divide-y divide-[var(--nova-border)] rounded-[var(--mkt-radius-lg)] border border-[var(--mkt-border)] bg-[var(--mkt-surface)]">
          {faqItems.map((item) => (
            <details key={item.id} className="group px-5 py-4">
              <summary className="cursor-pointer list-none font-semibold text-[var(--nova-ink)] [&::-webkit-details-marker]:hidden">
                <span className="flex items-start justify-between gap-4">
                  {item.q}
                  <span aria-hidden className="text-[var(--nova-teal)] group-open:hidden">+</span>
                  <span aria-hidden className="hidden text-[var(--nova-teal)] group-open:inline">−</span>
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

      <ClosingBand
        title={home.ctaTitle}
        body={home.ctaBody}
        action={home.ctaAction}
        href={home.ctaPrimaryHref}
        secondaryAction={home.ctaSecondary}
        secondaryHref={home.ctaSecondaryHref}
      />
    </>
  );
}

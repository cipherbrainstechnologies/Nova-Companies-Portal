import type { Metadata } from "next";
import Link from "next/link";
import { ClosingBand, MarketingLink } from "@/components/marketing/blocks";
import { HeroDiagram } from "@/components/marketing/home/hero-diagram";
import { IconBadge, MarketingSection, SurfaceCard } from "@/components/marketing/section";
import { getSiteCopy } from "@/content/public-site";
import { getRequestLocale } from "@/content/request-locale";

export async function generateMetadata(): Promise<Metadata> {
  const copy = getSiteCopy(await getRequestLocale());
  return {
    title: { absolute: copy.home.metaTitle },
    description: copy.meta.description,
    openGraph: {
      title: copy.home.metaTitle,
      description: copy.meta.description,
      type: "website",
    },
  };
}

export default async function HomePage() {
  const copy = getSiteCopy(await getRequestLocale());
  const home = copy.home;
  const faqItems = copy.faq.items.filter((item) => home.faqIds.includes(item.id));

  return (
    <>
      <section className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--nova-teal)]">{home.kicker}</p>
          <h1 className="h-macro mt-4 max-w-3xl text-balance text-[clamp(2.2rem,5.5vw,3.75rem)]">{home.title}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-[var(--nova-text-secondary)]">{home.lede}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <MarketingLink href={home.primaryHref}>{home.primary}</MarketingLink>
            <MarketingLink href={home.secondaryHref} variant="outline">{home.secondary}</MarketingLink>
          </div>
          <p className="mt-4 text-sm text-[var(--nova-text-secondary)]">{home.microcopy}</p>
          <p className="mt-4 text-sm text-[var(--nova-text-secondary)]">
            {home.clientSignIn}{" "}
            <Link href="/login/client" className="font-semibold text-[var(--nova-teal)]">
              {home.clientSignInLink}
            </Link>
          </p>
        </div>
        <div className="rounded-[var(--mkt-radius-lg)] border border-[var(--mkt-border)] bg-[var(--mkt-surface)] p-6 shadow-[var(--mkt-shadow)] md:p-8">
          <HeroDiagram />
        </div>
      </section>

      <section className="mt-14 grid gap-4 md:grid-cols-3" aria-label="Core benefits">
        {home.valueStrip.map((item) => (
          <article
            key={item.title}
            className="flex gap-4 rounded-[var(--mkt-radius)] border border-[var(--mkt-border)] bg-[var(--mkt-surface)] p-5"
          >
            <IconBadge label={item.title} />
            <div>
              <h2 className="font-bold text-[var(--nova-ink)]">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--nova-text-secondary)]">{item.body}</p>
            </div>
          </article>
        ))}
      </section>

      <MarketingSection id="problem" title={home.problemSolution.title}>
        <div className="grid gap-6 lg:grid-cols-2">
          <p className="text-sm leading-relaxed text-[var(--nova-text-secondary)]">{home.problemSolution.problem}</p>
          <p className="text-sm leading-relaxed text-[var(--nova-text-secondary)]">{home.problemSolution.solution}</p>
        </div>
      </MarketingSection>

      <MarketingSection id="process" title={home.process.title} lede={home.process.lede}>
        <ol className="grid gap-4 md:grid-cols-2">
          {home.process.steps.map((step, index) => (
            <li
              key={step.title}
              className="rounded-[var(--mkt-radius)] border border-[var(--mkt-border)] bg-[var(--mkt-surface)] p-6"
            >
              <span className="text-sm font-bold text-[var(--nova-teal)]">Step {index + 1}</span>
              <h3 className="mt-2 font-bold text-[var(--nova-ink)]">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--nova-text-secondary)]">{step.body}</p>
            </li>
          ))}
        </ol>
      </MarketingSection>

      <MarketingSection id="services" title={home.servicesGrid.title}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {home.servicesGrid.items.map((item) => (
            <SurfaceCard key={item.title} title={item.title} href={item.href}>
              <p>{item.body}</p>
              <p className="mt-3 text-sm font-semibold text-[var(--nova-teal)]">Learn more →</p>
            </SurfaceCard>
          ))}
        </div>
      </MarketingSection>

      <MarketingSection id="why-nova" title={home.whyNova.title}>
        <div className="grid gap-4 md:grid-cols-2">
          {home.whyNova.points.map((point) => (
            <article
              key={point.title}
              className="rounded-[var(--mkt-radius)] border border-[var(--mkt-border)] bg-[var(--mkt-surface)] p-6"
            >
              <h3 className="font-bold text-[var(--nova-ink)]">{point.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--nova-text-secondary)]">{point.body}</p>
            </article>
          ))}
        </div>
      </MarketingSection>

      <MarketingSection id="costs" title={home.costTransparency.title}>
        <p className="max-w-3xl text-sm leading-relaxed text-[var(--nova-text-secondary)]">{home.costTransparency.body}</p>
        <p className="mt-6">
          <MarketingLink href={home.costTransparency.ctaHref}>{home.costTransparency.cta}</MarketingLink>
        </p>
      </MarketingSection>

      <MarketingSection id="india" title={home.indiaConsiderations.title}>
        <p className="text-sm font-medium text-[var(--nova-muted)]">{home.indiaConsiderations.disclaimer}</p>
        <div className="mt-6 divide-y divide-[var(--nova-border)] rounded-[var(--mkt-radius-lg)] border border-[var(--mkt-border)] bg-[var(--mkt-surface)]">
          {home.indiaConsiderations.items.map((item) => (
            <details key={item.title} className="group px-5 py-4">
              <summary className="cursor-pointer list-none font-semibold text-[var(--nova-ink)] [&::-webkit-details-marker]:hidden">
                <span className="flex items-start justify-between gap-4">
                  {item.title}
                  <span aria-hidden className="text-[var(--nova-teal)] group-open:hidden">+</span>
                  <span aria-hidden className="hidden text-[var(--nova-teal)] group-open:inline">−</span>
                </span>
              </summary>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[var(--nova-text-secondary)]">{item.body}</p>
            </details>
          ))}
        </div>
        <p className="mt-4">
          <Link href={home.indiaConsiderations.guideHref} className="text-sm font-semibold text-[var(--nova-teal)]">
            {home.indiaConsiderations.guideLink}
          </Link>
        </p>
      </MarketingSection>

      <MarketingSection id="faq" title={home.faqTitle}>
        <div className="divide-y divide-[var(--nova-border)] rounded-[var(--mkt-radius-lg)] border border-[var(--mkt-border)] bg-[var(--mkt-surface)]">
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
          <Link href="/faq" className="text-sm font-semibold text-[var(--nova-teal)]">{copy.nav.faq}</Link>
        </p>
      </MarketingSection>

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

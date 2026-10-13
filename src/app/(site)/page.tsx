import type { Metadata } from "next";
import Link from "next/link";
import { MarketingLink } from "@/components/marketing/blocks";
import { HeroDashboardVisual } from "@/components/marketing/home/hero-dashboard-visual";
import { FeatureTabs } from "@/components/marketing/home/feature-tabs";
import { getSiteCopy } from "@/content/public-site";
import { getRequestLocale } from "@/content/request-locale";

export async function generateMetadata(): Promise<Metadata> {
  const copy = getSiteCopy(await getRequestLocale());
  return {
    title: { absolute: copy.home.metaTitle },
    description: copy.meta.description,
    openGraph: { title: copy.home.metaTitle, description: copy.meta.description, type: "website" },
  };
}

export default async function HomePage() {
  const copy = getSiteCopy(await getRequestLocale());
  const home = copy.home;

  return (
    <>
      <section className="mkt-section bg-white pt-8 md:pt-12">
        <div className="mkt-container text-center">
          <p className="mkt-eyebrow">{home.kicker}</p>
          <h1 className="mkt-h1 mx-auto mt-5 max-w-4xl text-balance">
            {home.titlePrefix}
            <span className="mkt-accent-text">{home.titleHighlight}</span>
            {home.titleSuffix}
          </h1>
          <p className="mkt-lead mx-auto mt-6 max-w-2xl">{home.lede}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <MarketingLink href={home.primaryHref}>{home.primary}</MarketingLink>
            <MarketingLink href={home.secondaryHref} variant="outline">{home.secondary}</MarketingLink>
          </div>
          <p className="mt-4 text-sm text-[var(--mkt-text-secondary)]">{home.microcopy}</p>
          <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-[var(--mkt-text-secondary)]">
            {home.trustRow.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--mkt-accent)]" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
          <HeroDashboardVisual />
          <p className="mt-6 text-sm text-[var(--mkt-text-secondary)]">
            {home.clientSignIn}{" "}
            <Link href="/login/client" className="font-semibold text-[var(--mkt-accent)]">{home.clientSignInLink}</Link>
          </p>
        </div>
      </section>

      <section className="border-y border-[var(--mkt-border)] bg-[var(--mkt-soft-bg)] py-6">
        <div className="mkt-container flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-[var(--mkt-text-secondary)]">
          {home.valueStrip.map((item) => (
            <span key={item.title} className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-xs font-bold text-[var(--mkt-accent)]" aria-hidden>✓</span>
              {item.title}
            </span>
          ))}
        </div>
      </section>

      <section className="mkt-section">
        <div className="mkt-container">
          <h2 className="mkt-h2 mx-auto max-w-3xl text-center text-balance">{home.problemSolution.title}</h2>
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <article className="rounded-[var(--mkt-radius-lg)] bg-[var(--mkt-card)] p-8">
              <h3 className="text-xl font-bold">{home.problemSolution.withoutTitle}</h3>
              <ul className="mt-6 space-y-3 text-sm text-[var(--mkt-text-secondary)]">
                {home.problemSolution.withoutItems.map((item) => (
                  <li key={item} className="flex gap-2"><span className="text-[var(--mkt-accent)]">•</span>{item}</li>
                ))}
              </ul>
            </article>
            <article className="rounded-[var(--mkt-radius-lg)] bg-[var(--mkt-dark)] p-8 text-white">
              <h3 className="text-xl font-bold">{home.problemSolution.withTitle}</h3>
              <p className="mt-6 text-sm leading-relaxed text-white/80">{home.problemSolution.withBody}</p>
              <p className="mt-4 text-xs leading-relaxed text-white/55">{home.problemSolution.withNote}</p>
            </article>
          </div>
        </div>
      </section>

      <section className="mkt-section bg-[var(--mkt-soft-bg)]">
        <div className="mkt-container">
          <h2 className="mkt-h2 text-center">{home.process.title}</h2>
          <ol className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {home.process.steps.map((step, i) => (
              <li key={step.title} className="rounded-[var(--mkt-radius-lg)] border border-[var(--mkt-border)] bg-white p-6">
                <p className="text-3xl font-bold text-[var(--mkt-accent)]">{String(i + 1).padStart(2, "0")}</p>
                <h3 className="mt-3 font-bold">{step.title}</h3>
                <p className="mt-2 text-sm text-[var(--mkt-text-secondary)]">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mkt-section" id="services">
        <div className="mkt-container">
          <h2 className="mkt-h2 max-w-2xl">{home.servicesGrid.title}</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {home.servicesGrid.items.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className={`group rounded-[var(--mkt-radius-lg)] border border-[var(--mkt-border)] bg-white p-6 transition-shadow hover:shadow-[var(--mkt-shadow)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mkt-accent)] ${item.large ? "md:col-span-2 lg:col-span-1 lg:row-span-1 bg-[var(--mkt-soft-bg)]" : ""}`}
              >
                <h3 className="text-lg font-bold group-hover:text-[var(--mkt-accent)]">{item.title}</h3>
                <p className="mt-2 text-sm text-[var(--mkt-text-secondary)]">{item.body}</p>
                <span className="mt-4 inline-block text-sm font-semibold text-[var(--mkt-accent)]">Learn more →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <FeatureTabs copy={home.darkFeature} />

      <section className="mkt-section">
        <div className="mkt-container">
          <h2 className="mkt-h2 text-center">{home.comparison.title}</h2>
          <div className="mt-10 overflow-x-auto rounded-[var(--mkt-radius-lg)] border border-[var(--mkt-border)]">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-[var(--mkt-soft-bg)]">
                <tr>
                  <th className="px-4 py-3 font-semibold"> </th>
                  <th className="px-4 py-3 font-semibold">{home.comparison.ownEntity}</th>
                  <th className="px-4 py-3 font-semibold text-[var(--mkt-accent)]">{home.comparison.eor}</th>
                </tr>
              </thead>
              <tbody>
                {home.comparison.rows.map((row) => (
                  <tr key={row.aspect} className="border-t border-[var(--mkt-border)]">
                    <th className="px-4 py-3 font-medium">{row.aspect}</th>
                    <td className="px-4 py-3 text-[var(--mkt-text-secondary)]">{row.own}</td>
                    <td className="px-4 py-3 text-[var(--mkt-text-secondary)]">{row.eor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-center text-sm text-[var(--mkt-text-secondary)]">{home.comparison.footnote}</p>
        </div>
      </section>

      <section className="mkt-section bg-[var(--mkt-soft-bg)]">
        <div className="mkt-container">
          <h2 className="mkt-h2">{home.costSection.title}</h2>
          <p className="mkt-lead mt-4 max-w-2xl">{home.costSection.body}</p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {home.costSection.categories.map((cat) => (
              <article key={cat.title} className="rounded-[var(--mkt-radius)] border border-[var(--mkt-border)] bg-white p-5">
                <h3 className="font-bold">{cat.title}</h3>
                <p className="mt-2 text-sm text-[var(--mkt-text-secondary)]">{cat.body}</p>
              </article>
            ))}
          </div>
          <p className="mt-8">
            <MarketingLink href={home.costSection.ctaHref}>{home.costSection.cta}</MarketingLink>
          </p>
        </div>
      </section>

      <section className="mkt-section">
        <div className="mkt-container">
          <h2 className="mkt-h2">{home.complianceSection.title}</h2>
          <p className="mt-3 text-sm text-[var(--mkt-text-secondary)]">{home.complianceSection.disclaimer}</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {home.complianceSection.items.map((item) => (
              <article key={item.title} className="rounded-[var(--mkt-radius)] bg-[var(--mkt-card)] p-5">
                <h3 className="font-bold">{item.title}</h3>
                <p className="mt-2 text-sm text-[var(--mkt-text-secondary)]">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mkt-section bg-[var(--mkt-soft-bg)]" id="why-nova">
        <div className="mkt-container">
          <h2 className="mkt-h2 text-center">{home.principles.title}</h2>
          <p className="mkt-lead mx-auto mt-4 max-w-2xl text-center">{home.principles.lede}</p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {home.principles.cards.map((card) => (
              <article key={card.title} className="rounded-[var(--mkt-radius-lg)] border border-[var(--mkt-border)] bg-white p-6">
                <h3 className="font-bold">{card.title}</h3>
                <p className="mt-2 text-sm text-[var(--mkt-text-secondary)]">{card.body}</p>
              </article>
            ))}
          </div>
          <p className="mt-8 text-center text-xs text-[var(--mkt-text-secondary)]">{home.principles.testimonialPlaceholder}</p>
        </div>
      </section>

      <section className="mkt-section">
        <div className="mkt-container overflow-hidden rounded-[var(--mkt-radius-lg)] bg-[var(--mkt-dark)] px-6 py-14 text-center text-white md:px-12">
          <h2 className="mkt-h2 text-white">{home.finalCta.title}</h2>
          <p className="mx-auto mt-4 max-w-xl text-white/75">{home.finalCta.body}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <MarketingLink href={home.finalCta.primaryHref} variant="inverse">{home.finalCta.primary}</MarketingLink>
            <MarketingLink href={home.finalCta.secondaryHref} variant="darkOutline">{home.finalCta.secondary}</MarketingLink>
          </div>
        </div>
      </section>
    </>
  );
}

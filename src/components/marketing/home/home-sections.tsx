import Link from "next/link";
import type { SiteCopy } from "@/content/public-site";
import { MarketingLink } from "@/components/marketing/blocks";
import { CostDashboardPreview } from "@/components/marketing/home/cost-dashboard-preview";
import { FAQAccordion } from "@/components/marketing/home/faq-accordion";

export function HomeBelowFold({ copy }: { copy: SiteCopy }) {
  const home = copy.home;
  const faqs = home.faqIds
    .map((id) => copy.faq.items.find((item) => item.id === id))
    .filter((item): item is (typeof copy.faq.items)[number] => Boolean(item));

  return (
    <>
      <section aria-label={home.valueStrip.map((item) => item.title).join(", ")} className="bg-white">
        <div className="mkt-container grid gap-8 py-12 md:grid-cols-3 md:py-16">
          {home.valueStrip.map((item, index) => (
            <article key={item.title} className="md:border-l md:border-[var(--nova-border)] md:pl-6 md:first:border-l-0 md:first:pl-0">
              <p className="text-sm font-semibold text-[var(--nova-purple)]">{String(index + 1).padStart(2, "0")}</p>
              <h2 className="mt-2 text-lg font-bold text-[var(--nova-text)]">{item.title}</h2>
              <p className="mt-2 text-base leading-relaxed text-[var(--nova-muted)]">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="why-nova" className="mkt-section scroll-mt-24 bg-[var(--nova-surface-soft)]">
        <div className="mkt-container grid items-start gap-12 lg:grid-cols-2">
          <div>
            <h2 className="mkt-h2">{home.whyNova.title}</h2>
            <ol className="mt-8 space-y-6">
              {home.whyNova.points.map((point, index) => (
                <li key={point.title} className="grid grid-cols-[auto_1fr] gap-4">
                  <span className="text-sm font-semibold text-[var(--nova-purple)]">{String(index + 1).padStart(2, "0")}</span>
                  <span>
                    <span className="block font-bold text-[var(--nova-text)]">{point.title}</span>
                    <span className="mt-1 block text-base leading-relaxed text-[var(--nova-muted)]">{point.body}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <div className="grid gap-4">
            <article className="rounded-[1.5rem] border border-[var(--nova-border)] bg-white p-7">
              <h3 className="text-xl font-bold text-[var(--nova-text)]">{home.problemSolution.withoutTitle}</h3>
              <ul className="mt-5 space-y-3 text-base leading-relaxed text-[var(--nova-muted)]">
                {home.problemSolution.withoutItems.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--nova-purple)]" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </article>
            <article className="rounded-[1.5rem] bg-[var(--nova-navy)] p-7 text-white">
              <h3 className="text-xl font-bold">{home.problemSolution.withTitle}</h3>
              <p className="mt-4 text-base leading-relaxed text-white/80">{home.problemSolution.withBody}</p>
              <p className="mt-4 text-sm leading-relaxed text-white/65">{home.problemSolution.withNote}</p>
            </article>
          </div>
        </div>
      </section>

      <section className="mkt-section" aria-labelledby="how-eor-heading">
        <div className="mkt-container">
          <h2 id="how-eor-heading" className="mkt-h2 max-w-3xl">{home.process.title}</h2>
          <ol className="relative mt-12 grid gap-8 md:grid-cols-4">
            <span className="absolute left-0 right-0 top-5 hidden h-px bg-[var(--nova-border)] md:block" aria-hidden />
            {home.process.steps.map((step, index) => (
              <li key={step.title} className="relative">
                <span className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--nova-purple)] text-sm font-bold text-white">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-4 text-lg font-bold text-[var(--nova-text)]">{step.title}</h3>
                <p className="mt-2 text-base leading-relaxed text-[var(--nova-muted)]">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="services" className="mkt-section scroll-mt-24 bg-[var(--nova-surface-soft)]">
        <div className="mkt-container">
          <h2 className="mkt-h2 max-w-2xl">{home.servicesGrid.title}</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {home.servicesGrid.items.map((item, index) => {
              const featured = index === 0;
              return (
                <Link
                  key={item.title}
                  href={item.href}
                  className={`group flex flex-col rounded-[1.5rem] p-7 transition-shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--nova-purple)] ${
                    featured
                      ? "bg-[var(--nova-navy)] text-white md:col-span-2 lg:min-h-[16rem] lg:justify-between"
                      : "border border-[var(--nova-border)] bg-white text-[var(--nova-text)] hover:shadow-[var(--mkt-shadow)]"
                  }`}
                >
                  <span>
                    <h3 className="text-xl font-bold">{item.title}</h3>
                    <p className={`mt-3 text-base leading-relaxed ${featured ? "text-white/75" : "text-[var(--nova-muted)]"}`}>{item.body}</p>
                  </span>
                  <span className={`mt-6 text-sm font-semibold ${featured ? "text-white" : "text-[var(--nova-purple)]"}`}>
                    Learn more <span aria-hidden>→</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section id="costs" className="mkt-section scroll-mt-24">
        <div className="mkt-container grid items-start gap-10 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
          <div>
            <h2 className="mkt-h2">{home.costSection.title}</h2>
            <p className="mkt-lead mt-4">{home.costSection.body}</p>
            <ol className="mt-8 divide-y divide-[var(--nova-border)] border-y border-[var(--nova-border)]">
              {home.costSection.categories.map((category, index) => (
                <li key={category.title} className="grid grid-cols-[auto_1fr] gap-4 py-4">
                  <span className="text-sm font-semibold text-[var(--nova-purple)]">{String(index + 1).padStart(2, "0")}</span>
                  <span>
                    <span className="block font-bold text-[var(--nova-text)]">{category.title}</span>
                    <span className="mt-1 block text-sm leading-relaxed text-[var(--nova-muted)]">{category.body}</span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-6 text-sm leading-relaxed text-[var(--nova-muted)]">{home.proof.body}</p>
            <div className="mt-8">
              <MarketingLink href={home.costSection.ctaHref}>{home.costSection.cta}</MarketingLink>
            </div>
          </div>
          <CostDashboardPreview copy={home.proof} embedded />
        </div>
      </section>

      <section className="mkt-section bg-[var(--nova-surface-soft)]" aria-labelledby="comparison-heading">
        <div className="mkt-container">
          <h2 id="comparison-heading" className="mkt-h2 max-w-3xl">{home.comparison.title}</h2>
          <div className="mt-10 hidden overflow-hidden rounded-[1.5rem] border border-[var(--nova-border)] bg-white md:block">
            <table className="w-full text-left text-base">
              <caption className="sr-only">{home.comparison.title}</caption>
              <thead>
                <tr className="border-b border-[var(--nova-border)]">
                  <th className="px-5 py-4 font-semibold text-[var(--nova-muted)]" scope="col"> </th>
                  <th className="px-5 py-4 font-semibold text-[var(--nova-text)]" scope="col">{home.comparison.ownEntity}</th>
                  <th className="bg-[var(--nova-purple-light)] px-5 py-4 font-semibold text-[var(--nova-navy)]" scope="col">{home.comparison.eor}</th>
                </tr>
              </thead>
              <tbody>
                {home.comparison.rows.map((row) => (
                  <tr key={row.aspect} className="border-t border-[var(--nova-border)]">
                    <th className="px-5 py-4 align-top font-semibold text-[var(--nova-text)]" scope="row">{row.aspect}</th>
                    <td className="px-5 py-4 align-top text-[var(--nova-muted)]">{row.own}</td>
                    <td className="bg-[var(--nova-purple-light)]/60 px-5 py-4 align-top font-medium text-[var(--nova-text)]">{row.eor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-8 space-y-3 md:hidden">
            {home.comparison.rows.map((row) => (
              <article key={row.aspect} className="rounded-2xl border border-[var(--nova-border)] bg-white p-4">
                <h3 className="font-bold text-[var(--nova-text)]">{row.aspect}</h3>
                <p className="mt-3 text-sm font-semibold text-[var(--nova-muted)]">{home.comparison.ownEntity}</p>
                <p className="mt-1 text-sm leading-relaxed text-[var(--nova-muted)]">{row.own}</p>
                <p className="mt-3 text-sm font-semibold text-[var(--nova-purple)]">{home.comparison.eor}</p>
                <p className="mt-1 text-sm leading-relaxed text-[var(--nova-text)]">{row.eor}</p>
              </article>
            ))}
          </div>
          <p className="mx-auto mt-6 max-w-3xl text-sm leading-relaxed text-[var(--nova-muted)]">{home.comparison.footnote}</p>
        </div>
      </section>

      <section className="mkt-section bg-[var(--nova-navy)] text-white" aria-labelledby="compliance-heading">
        <div className="mkt-container grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-start">
          <div>
            <h2 id="compliance-heading" className="mkt-h2 text-white">{home.indiaConsiderations.title}</h2>
            <p className="mt-4 text-base leading-relaxed text-white/75">{home.indiaConsiderations.disclaimer}</p>
            <p className="mt-6">
              <Link href={home.indiaConsiderations.guideHref} className="text-sm font-semibold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white">
                {home.indiaConsiderations.guideLink}
              </Link>
            </p>
          </div>
          <ul className="divide-y divide-white/15 border-y border-white/15">
            {home.indiaConsiderations.items.map((item) => (
              <li key={item.title} className="py-4">
                <h3 className="font-bold">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/75">{item.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mkt-section" aria-labelledby="faq-heading">
        <div className="mkt-container grid items-start gap-8 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
          <h2 id="faq-heading" className="mkt-h2 lg:sticky lg:top-28">{home.faqTitle}</h2>
          <FAQAccordion items={faqs} allHref="/faq" allLabel={copy.nav.faq} />
        </div>
      </section>

      <section className="mkt-section pt-0">
        <div className="mkt-container">
          <div className="relative overflow-hidden rounded-[2rem] bg-[var(--nova-navy)] px-6 py-14 text-white md:px-14 md:py-20">
            <div
              className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[var(--nova-purple)]/40 blur-3xl"
              aria-hidden
            />
            <h2 className="mkt-h2 relative max-w-3xl text-white">{home.finalCta.title}</h2>
            <p className="relative mt-4 max-w-2xl text-base leading-relaxed text-white/78 md:text-lg">{home.finalCta.body}</p>
            <div className="relative mt-8 flex flex-col gap-3 sm:flex-row">
              <MarketingLink href={home.finalCta.primaryHref} variant="inverse">{home.finalCta.primary}</MarketingLink>
              <MarketingLink href={home.finalCta.secondaryHref} variant="darkOutline">{home.finalCta.secondary}</MarketingLink>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

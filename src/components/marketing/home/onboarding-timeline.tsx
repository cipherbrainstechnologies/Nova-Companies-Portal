import type { SiteCopy } from "@/content/public-site";

export function OnboardingTimeline({ copy }: { copy: SiteCopy["home"]["timeline"] }) {
  return (
    <section className="mt-16" aria-labelledby="timeline-heading">
      <h2 id="timeline-heading" className="h-display text-[clamp(1.6rem,3vw,2.15rem)]">
        {copy.title}
      </h2>
      <p className="mt-2 max-w-2xl text-[var(--nova-text-secondary)]">{copy.lede}</p>
      <ol className="mt-8 space-y-3">
        {copy.steps.map((step, index) => (
          <li key={step.title}>
            <details className="group rounded-[var(--mkt-radius)] border border-[var(--mkt-border)] bg-[var(--mkt-surface)] px-5 py-4 open:shadow-[var(--mkt-shadow)]">
              <summary className="cursor-pointer list-none font-semibold text-[var(--nova-ink)] [&::-webkit-details-marker]:hidden">
                <span className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--nova-teal-soft)] text-sm font-bold text-[var(--nova-teal)]">
                    {index + 1}
                  </span>
                  <span className="flex-1 pt-0.5">{step.title}</span>
                  <span className="text-[var(--nova-teal)] group-open:hidden" aria-hidden>+</span>
                  <span className="hidden text-[var(--nova-teal)] group-open:inline" aria-hidden>−</span>
                </span>
              </summary>
              <dl className="mt-4 grid gap-2 pl-11 text-sm sm:grid-cols-3">
                <div>
                  <dt className="font-semibold text-[var(--nova-muted)]">{copy.ownerLabel}</dt>
                  <dd className="text-[var(--nova-text-secondary)]">{step.owner}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[var(--nova-muted)]">{copy.deliverableLabel}</dt>
                  <dd className="text-[var(--nova-text-secondary)]">{step.deliverable}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[var(--nova-muted)]">{copy.gateLabel}</dt>
                  <dd className="text-[var(--nova-text-secondary)]">{step.gate}</dd>
                </div>
              </dl>
            </details>
          </li>
        ))}
      </ol>
      <p className="mt-4">
        <a href="/how-it-works" className="text-sm font-semibold text-[var(--nova-teal)]">
          {copy.fullPathLink}
        </a>
      </p>
    </section>
  );
}

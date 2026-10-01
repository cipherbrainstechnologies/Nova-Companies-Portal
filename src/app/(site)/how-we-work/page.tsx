import type { Metadata } from "next";
import { ClosingBand, PageIntro } from "@/components/marketing/blocks";
import { getSiteCopy } from "@/content/public-site";
import { getRequestLocale } from "@/content/request-locale";

export async function generateMetadata(): Promise<Metadata> {
  const copy = getSiteCopy(await getRequestLocale());
  return { title: copy.how.metaTitle, description: copy.how.lede };
}

export default async function HowWeWorkPage() {
  const page = getSiteCopy(await getRequestLocale()).how;
  return (
    <>
      <PageIntro kicker={page.kicker} title={page.title} lede={page.lede} />
      <ol className="mt-10 space-y-4">
        {page.steps.map((step, index) => (
          <li key={step.title} className="grid gap-3 rounded-[var(--nova-radius-lg)] border border-[var(--nova-border)] bg-[var(--nova-surface)] p-6 md:grid-cols-[4rem_1fr]">
            <p className="text-sm font-bold text-[var(--nova-teal)]">{String(index + 1).padStart(2, "0")}</p>
            <div>
              <h2 className="text-lg font-bold text-[var(--nova-ink)]">{step.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--nova-text-secondary)]">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <section className="mt-10" aria-labelledby="need-heading">
        <h2 id="need-heading" className="h-display text-2xl">
          {page.needTitle}
        </h2>
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {page.need.map((item) => (
            <li key={item} className="rounded-[var(--nova-radius)] bg-[var(--nova-surface)] px-4 py-3 text-sm text-[var(--nova-text)] ring-1 ring-[var(--nova-border)]">
              {item}
            </li>
          ))}
        </ul>
      </section>
      <ClosingBand title={page.ctaTitle} body={page.ctaBody} action={page.ctaAction} />
    </>
  );
}

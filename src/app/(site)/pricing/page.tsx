import type { Metadata } from "next";
import { ClosingBand, PageIntro } from "@/components/marketing/blocks";
import { getSiteCopy } from "@/content/public-site";
import { getRequestLocale } from "@/content/request-locale";

export async function generateMetadata(): Promise<Metadata> {
  const copy = getSiteCopy(await getRequestLocale());
  return { title: copy.pricing.metaTitle, description: copy.pricing.lede };
}

export default async function PricingPage() {
  const page = getSiteCopy(await getRequestLocale()).pricing;
  return (
    <>
      <PageIntro kicker={page.kicker} title={page.title} lede={page.lede} />
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {page.cards.map((card) => (
          <article key={card.title} className="rounded-[var(--nova-radius-lg)] border border-[var(--nova-border)] bg-[var(--nova-surface)] p-6">
            <h2 className="text-lg font-bold text-[var(--nova-ink)]">{card.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--nova-text-secondary)]">{card.body}</p>
          </article>
        ))}
      </div>
      <p className="mt-6 max-w-3xl text-sm leading-relaxed text-[var(--nova-text-secondary)]">{page.note}</p>
      <ClosingBand title={page.ctaTitle} body={page.ctaBody} action={page.ctaAction} />
    </>
  );
}

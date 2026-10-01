import type { Metadata } from "next";
import { MarketingLink, PageIntro } from "@/components/marketing/blocks";
import { getSiteCopy } from "@/content/public-site";
import { getRequestLocale } from "@/content/request-locale";

export async function generateMetadata(): Promise<Metadata> {
  const copy = getSiteCopy(await getRequestLocale());
  return { title: copy.careers.metaTitle, description: copy.careers.lede };
}

export default async function CareersPage() {
  const page = getSiteCopy(await getRequestLocale()).careers;
  return (
    <>
      <PageIntro kicker={page.kicker} title={page.title} lede={page.lede} />
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {page.cards.map((card) => (
          <article key={card.title} className="flex flex-col rounded-[var(--nova-radius-lg)] border border-[var(--nova-border)] bg-[var(--nova-surface)] p-6">
            <h2 className="text-lg font-bold text-[var(--nova-ink)]">{card.title}</h2>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-[var(--nova-text-secondary)]">{card.body}</p>
            <div className="mt-5">
              <MarketingLink href={card.href} variant="outline">
                {card.action}
              </MarketingLink>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

import type { Metadata } from "next";
import { ClosingBand, PageIntro } from "@/components/marketing/blocks";
import { getSiteCopy } from "@/content/public-site";
import { getRequestLocale } from "@/content/request-locale";

export async function generateMetadata(): Promise<Metadata> {
  const copy = getSiteCopy(await getRequestLocale());
  return { title: copy.who.metaTitle, description: copy.who.lede };
}

export default async function WhoWeServePage() {
  const page = getSiteCopy(await getRequestLocale()).who;
  return (
    <>
      <PageIntro kicker={page.kicker} title={page.title} lede={page.lede} />
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {page.items.map((item) => (
          <article key={item.title} className="rounded-[var(--nova-radius-lg)] border border-[var(--nova-border)] bg-[var(--nova-surface)] p-6">
            <h2 className="text-lg font-bold text-[var(--nova-ink)]">{item.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--nova-text-secondary)]">{item.body}</p>
          </article>
        ))}
      </div>
      <ClosingBand title={page.ctaTitle} body={page.ctaBody} action={page.ctaAction} />
    </>
  );
}

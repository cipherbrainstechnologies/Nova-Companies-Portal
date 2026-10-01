import type { Metadata } from "next";
import { ClosingBand, PageIntro } from "@/components/marketing/blocks";
import { getSiteCopy } from "@/content/public-site";
import { getRequestLocale } from "@/content/request-locale";

export async function generateMetadata(): Promise<Metadata> {
  const copy = getSiteCopy(await getRequestLocale());
  return { title: copy.about.metaTitle, description: copy.about.lede };
}

export default async function AboutPage() {
  const page = getSiteCopy(await getRequestLocale()).about;
  return (
    <>
      <PageIntro kicker={page.kicker} title={page.title} lede={page.lede} />
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {page.points.map((point) => (
          <article key={point.title} className="rounded-[var(--nova-radius-lg)] border border-[var(--nova-border)] bg-[var(--nova-surface)] p-6">
            <h2 className="text-lg font-bold text-[var(--nova-ink)]">{point.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--nova-text-secondary)]">{point.body}</p>
          </article>
        ))}
      </div>
      <ClosingBand title={page.ctaTitle} body={page.ctaBody} action={page.ctaAction} />
    </>
  );
}

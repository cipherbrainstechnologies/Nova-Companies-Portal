import type { Metadata } from "next";
import { ClosingBand, PageIntro } from "@/components/marketing/blocks";
import { getSiteCopy } from "@/content/public-site";
import { getRequestLocale } from "@/content/request-locale";

export async function generateMetadata(): Promise<Metadata> {
  const copy = getSiteCopy(await getRequestLocale());
  return { title: copy.services.metaTitle, description: copy.services.lede };
}

export default async function ServicesPage() {
  const page = getSiteCopy(await getRequestLocale()).services;
  return (
    <>
      <PageIntro kicker={page.kicker} title={page.title} lede={page.lede} />
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {page.items.map((item, index) => (
          <article key={item.title} className="rounded-[var(--nova-radius-lg)] border border-[var(--nova-border)] bg-[var(--nova-surface)] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--nova-teal)]">
              {String(index + 1).padStart(2, "0")}
            </p>
            <h2 className="mt-2 text-lg font-bold text-[var(--nova-ink)]">{item.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--nova-text-secondary)]">{item.body}</p>
          </article>
        ))}
      </div>
      <ClosingBand title={page.ctaTitle} body={page.ctaBody} action={page.ctaAction} />
    </>
  );
}

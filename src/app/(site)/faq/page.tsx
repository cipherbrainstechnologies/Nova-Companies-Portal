import type { Metadata } from "next";
import { ClosingBand, PageIntro } from "@/components/marketing/blocks";
import { getSiteCopy } from "@/content/public-site";
import { getRequestLocale } from "@/content/request-locale";

export async function generateMetadata(): Promise<Metadata> {
  const copy = getSiteCopy(await getRequestLocale());
  return { title: copy.faq.metaTitle, description: copy.faq.lede };
}

export default async function FaqPage() {
  const page = getSiteCopy(await getRequestLocale()).faq;
  return (
    <>
      <PageIntro kicker={page.kicker} title={page.title} lede={page.lede} />
      <div className="mt-10 divide-y divide-[var(--nova-border)] rounded-[var(--nova-radius-lg)] border border-[var(--nova-border)] bg-[var(--nova-surface)]">
        {page.items.map((item) => (
          <details key={item.q} className="group px-5 py-4">
            <summary className="cursor-pointer list-none font-semibold text-[var(--nova-ink)] [&::-webkit-details-marker]:hidden">
              <span className="flex items-start justify-between gap-4">
                {item.q}
                <span aria-hidden className="text-[var(--nova-teal)] group-open:hidden">
                  +
                </span>
                <span aria-hidden className="hidden text-[var(--nova-teal)] group-open:inline">
                  –
                </span>
              </span>
            </summary>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[var(--nova-text-secondary)]">{item.a}</p>
          </details>
        ))}
      </div>
      <ClosingBand title={page.ctaTitle} body={page.ctaBody} action={page.ctaAction} />
    </>
  );
}

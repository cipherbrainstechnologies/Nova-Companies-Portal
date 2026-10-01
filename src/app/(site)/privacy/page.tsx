import type { Metadata } from "next";
import { PageIntro } from "@/components/marketing/blocks";
import { getSiteCopy } from "@/content/public-site";
import { getRequestLocale } from "@/content/request-locale";

export async function generateMetadata(): Promise<Metadata> {
  const copy = getSiteCopy(await getRequestLocale());
  return { title: copy.privacy.metaTitle, description: copy.privacy.lede };
}

export default async function PrivacyPage() {
  const page = getSiteCopy(await getRequestLocale()).privacy;
  return (
    <>
      <PageIntro kicker={page.kicker} title={page.title} lede={page.lede} />
      <div className="mt-10 max-w-3xl space-y-8">
        {page.sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-lg font-bold text-[var(--nova-ink)]">{section.title}</h2>
            <p className="mt-2 leading-relaxed text-[var(--nova-text-secondary)]">{section.body}</p>
          </section>
        ))}
      </div>
    </>
  );
}

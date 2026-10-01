import type { Metadata } from "next";
import { PageIntro } from "@/components/marketing/blocks";
import { ContactForm } from "@/components/marketing/contact-form";
import { getSiteCopy } from "@/content/public-site";
import { getRequestLocale } from "@/content/request-locale";

export async function generateMetadata(): Promise<Metadata> {
  const copy = getSiteCopy(await getRequestLocale());
  return { title: copy.contact.metaTitle, description: copy.contact.lede };
}

export default async function ContactPage() {
  const page = getSiteCopy(await getRequestLocale()).contact;
  return (
    <>
      <PageIntro kicker={page.kicker} title={page.title} lede={page.lede} />
      <div className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[var(--nova-radius-lg)] border border-[var(--nova-border)] bg-[var(--nova-surface)] p-6 md:p-8">
          <ContactForm copy={page.form} />
        </div>
        <aside className="rounded-[var(--nova-radius-lg)] bg-[var(--nova-ink)] p-6 text-white md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/60">{page.emailLabel}</p>
          <a className="mt-3 block text-lg font-semibold text-white hover:text-[var(--nova-teal-soft)]" href={`mailto:${page.email}`}>
            {page.email}
          </a>
          <p className="mt-4 text-sm leading-relaxed text-white/80">{page.emailNote}</p>
        </aside>
      </div>
    </>
  );
}

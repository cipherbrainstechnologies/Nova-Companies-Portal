import type { Metadata } from "next";
import Link from "next/link";
import { ClosingBand, MarketingLink, PageIntro } from "@/components/marketing/blocks";
import { CostDashboardPreview } from "@/components/marketing/home/cost-dashboard-preview";
import { getSiteCopy } from "@/content/public-site";
import { getRequestLocale } from "@/content/request-locale";

export async function generateMetadata(): Promise<Metadata> {
  const page = getSiteCopy(await getRequestLocale()).eorIndia;
  return { title: page.metaTitle, description: page.lede };
}

export default async function EmployerOfRecordIndiaPage() {
  const copy = getSiteCopy(await getRequestLocale());
  const page = copy.eorIndia;

  return (
    <>
      <PageIntro kicker={page.kicker} title={page.title} lede={page.lede} />
      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <MarketingLink href="/contact">{page.ctaSecondary}</MarketingLink>
        <MarketingLink href="/pricing" variant="outline">{page.ctaPrimary}</MarketingLink>
      </div>
      <p className="mt-4 text-sm text-[var(--nova-text-secondary)]">
        {copy.home.clientSignIn}{" "}
        <Link href="/login/client" className="font-semibold text-[var(--nova-teal)]">
          {copy.home.clientSignInLink}
        </Link>
      </p>

      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {page.sections.map((section) => (
          <article key={section.title} className="rounded-[var(--mkt-radius)] border border-[var(--mkt-border)] bg-[var(--mkt-surface)] p-6">
            <h2 className="text-lg font-bold text-[var(--nova-ink)]">{section.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--nova-text-secondary)]">{section.body}</p>
          </article>
        ))}
      </div>

      <CostDashboardPreview copy={copy.home.proof} />

      <ClosingBand
        title={copy.home.ctaTitle}
        action={copy.home.ctaAction}
        href="/pricing"
        secondaryAction={copy.home.ctaSecondary}
        secondaryHref="/contact"
      />
    </>
  );
}

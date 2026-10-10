import type { Metadata } from "next";
import Link from "next/link";
import { MarketingLink, PageIntro } from "@/components/marketing/blocks";
import { PortalTourTabs } from "@/components/marketing/home/portal-tour-tabs";
import { getSiteCopy } from "@/content/public-site";
import { getRequestLocale } from "@/content/request-locale";

export async function generateMetadata(): Promise<Metadata> {
  const copy = getSiteCopy(await getRequestLocale());
  return {
    title: `${copy.nav.platform} | ${copy.meta.siteName}`,
    description: copy.home.portal.lede,
  };
}

export default async function PlatformPage() {
  const copy = getSiteCopy(await getRequestLocale());
  const portal = copy.home.portal;

  return (
    <>
      <PageIntro kicker={copy.nav.platform} title={portal.title} lede={portal.lede} />
      <p className="mt-4 text-sm text-[var(--nova-text-secondary)]">
        {copy.home.clientSignIn}{" "}
        <Link href="/login/client" className="font-semibold text-[var(--nova-teal)]">
          {copy.home.clientSignInLink}
        </Link>
      </p>
      <div className="mt-6">
        <MarketingLink href="/pricing">{copy.nav.getQuote}</MarketingLink>
      </div>
      <PortalTourTabs copy={portal} />
    </>
  );
}

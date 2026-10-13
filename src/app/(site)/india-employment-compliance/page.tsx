import type { Metadata } from "next";
import { MarketingLandingPage } from "@/components/marketing/landing-page";
import { getSiteCopy } from "@/content/public-site";
import { getRequestLocale } from "@/content/request-locale";

export async function generateMetadata(): Promise<Metadata> {
  const page = getSiteCopy(await getRequestLocale()).indiaEmploymentCompliance;
  return { title: page.metaTitle, description: page.lede };
}

export default async function IndiaEmploymentCompliancePage() {
  const page = getSiteCopy(await getRequestLocale()).indiaEmploymentCompliance;
  return <MarketingLandingPage page={page} />;
}

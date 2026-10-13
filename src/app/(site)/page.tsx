import type { Metadata } from "next";
import { HeroSection } from "@/components/marketing/home/hero-section";
import { HomeBelowFold } from "@/components/marketing/home/home-sections";
import { getSiteCopy } from "@/content/public-site";
import { getRequestLocale } from "@/content/request-locale";

export async function generateMetadata(): Promise<Metadata> {
  const copy = getSiteCopy(await getRequestLocale());
  return {
    title: { absolute: copy.home.metaTitle },
    description: copy.meta.description,
    openGraph: { title: copy.home.metaTitle, description: copy.meta.description, type: "website" },
  };
}

export default async function HomePage() {
  const copy = getSiteCopy(await getRequestLocale());
  return (
    <div data-home>
      <HeroSection home={copy.home} />
      <HomeBelowFold copy={copy} />
    </div>
  );
}

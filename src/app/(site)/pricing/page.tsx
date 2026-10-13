import type { Metadata } from "next";
import { Suspense } from "react";
import { ClosingBand, PageIntro } from "@/components/marketing/blocks";
import { PricingCalculator } from "@/components/marketing/pricing-calculator";
import { PricingPlans } from "@/components/marketing/pricing-plans";
import { getSiteCopy } from "@/content/public-site";
import { publicSiteUrl } from "@/content/public-site/commercial-plans";
import { getRequestLocale } from "@/content/request-locale";

export async function generateMetadata(): Promise<Metadata> {
  const copy = getSiteCopy(await getRequestLocale());
  return {
    title: { absolute: copy.pricing.metaTitle },
    description: copy.pricing.lede,
    alternates: { canonical: "/pricing" },
  };
}

export default async function PricingPage() {
  const page = getSiteCopy(await getRequestLocale()).pricing;
  const offers = [
    { name: "Essential", price: "5000" },
    { name: "Managed", price: "7500" },
  ];
  const structured = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Nova Workforce employment services in India",
    url: `${publicSiteUrl()}/pricing`,
    provider: {
      "@type": "Organization",
      name: "Nova Workforce",
      url: publicSiteUrl(),
    },
    areaServed: ["United Kingdom", "United States", "Canada", "Australia", "United Arab Emirates"],
    offers: offers.map((offer) => ({
      "@type": "Offer",
      name: offer.name,
      price: offer.price,
      priceCurrency: "INR",
      url: `${publicSiteUrl()}/pricing`,
      description: "Monthly service fee per employee. Salaries, statutory costs, insurance, FX, optional services, and applicable taxes are charged separately.",
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structured) }} />
      <PageIntro kicker={page.kicker} title={page.title} lede={page.lede} />
      <PricingPlans />
      <section className="mt-16">
        <p className="max-w-3xl text-sm leading-relaxed text-[var(--nova-text-secondary)]">{page.worksheetNote}</p>
        <Suspense fallback={<p className="mt-8 text-sm text-[var(--nova-muted)]">Loading the cost worksheet…</p>}>
          <PricingCalculator copy={page.calculator} />
        </Suspense>
      </section>
      <ClosingBand title={page.ctaTitle} body={page.ctaBody} action={page.ctaAction} href="/contact?topic=eor" />
    </>
  );
}

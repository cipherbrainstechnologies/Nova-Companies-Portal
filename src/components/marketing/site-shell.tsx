import type { Locale } from "@/i18n";
import { getSiteCopy } from "@/content/public-site";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { MobileQuoteBar } from "@/components/marketing/mobile-quote-bar";

export function SiteShell({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const copy = getSiteCopy(locale);

  return (
    <div className="min-h-screen" data-marketing="true">
      <SiteHeader copy={copy} />
      <main id="main" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <SiteFooter copy={copy} />
      <MobileQuoteBar label={copy.nav.talkExpert} />
    </div>
  );
}

import { SiteShell } from "@/components/marketing/site-shell";
import { getRequestLocale } from "@/content/request-locale";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const locale = await getRequestLocale();
  return <SiteShell locale={locale}>{children}</SiteShell>;
}

import Link from "next/link";
import { Briefcase, Building2, UserPlus, Wallet } from "lucide-react";
import type { SiteCopy } from "@/content/public-site";
import { MarketingLink } from "@/components/marketing/blocks";
import { HeroDashboardVisual } from "@/components/marketing/home/hero-dashboard-visual";

const BENEFIT_ICONS = [Briefcase, Wallet, UserPlus, Building2] as const;

export function HeroSection({ home }: { home: SiteCopy["home"] }) {
  return (
    <section className="relative overflow-x-clip bg-[var(--nova-surface-soft)]" aria-labelledby="hero-title">
      <div className="mkt-hero-surface rounded-b-[2rem] pb-10 pt-10 sm:rounded-b-[2.5rem] sm:pb-14 sm:pt-12 lg:pb-16 lg:pt-14 xl:rounded-b-[3.5rem] xl:pb-[22rem] xl:pt-16">
        <div className="mkt-container">
          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.28fr)_minmax(16rem,0.72fr)] lg:gap-10 xl:gap-14">
            <h1 id="hero-title" className="mkt-hero-title text-white">
              {home.headlineLines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </h1>
            <div className="lg:pt-2 lg:justify-self-end">
              <p className="max-w-[34rem] text-base leading-relaxed text-white/88 sm:text-[17px] lg:text-[18px]">
                {home.lede}
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <MarketingLink href={home.primaryHref} variant="heroPrimary" className="self-stretch sm:self-auto">
                  {home.primary}
                </MarketingLink>
                <MarketingLink href={home.secondaryHref} variant="heroSecondary" className="self-stretch sm:self-auto">
                  {home.secondary}
                </MarketingLink>
              </div>
              <p className="mt-4 text-sm text-white/75">
                {home.clientSignIn}{" "}
                <Link href="/login/client" className="font-semibold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white">
                  {home.clientSignInLink}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mkt-container relative z-10 mt-6 xl:-mt-[20rem]">
        <div className="relative xl:min-h-[520px]">
          <div className="relative z-10 xl:absolute xl:left-40 xl:top-2 xl:w-[68%]">
            <HeroDashboardVisual />
          </div>

          <ul className="relative z-20 mt-4 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 xl:absolute xl:right-10 xl:top-4 xl:mt-0 xl:flex xl:w-[15.25rem] xl:flex-col">
            {home.heroBenefits.map((benefit, index) => (
              <li key={benefit.title} className={index % 2 === 0 ? "xl:mr-8" : "xl:ml-3"}>
                <FloatingBenefitCard title={benefit.title} body={benefit.body} index={index} />
              </li>
            ))}
          </ul>

          <aside className="relative z-20 mt-3 max-w-sm rounded-2xl border border-[var(--nova-border)] bg-white p-4 shadow-[0_16px_40px_rgb(12_12_50_/_0.1)] xl:absolute xl:bottom-4 xl:left-0 xl:mt-0 xl:w-[13.25rem]">
            <p className="text-sm font-bold text-[var(--nova-text)]">{home.heroAside.title}</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--nova-muted)]">{home.heroAside.body}</p>
          </aside>
        </div>
      </div>
    </section>
  );
}

function FloatingBenefitCard({ title, body, index }: { title: string; body: string; index: number }) {
  const Icon = BENEFIT_ICONS[index % BENEFIT_ICONS.length];
  return (
    <article className="flex gap-3 rounded-2xl bg-[var(--nova-purple)] px-4 py-3.5 text-white shadow-[0_16px_36px_rgb(88_87_245_/_0.32)]">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span>
        <span className="block text-sm font-semibold leading-snug">{title}</span>
        <span className="mt-0.5 block text-[13px] leading-snug text-white/80">{body}</span>
      </span>
    </article>
  );
}

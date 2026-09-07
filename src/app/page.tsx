import Link from "next/link";
import { t } from "@/i18n";
import { Button } from "@/components/ui";
import {
  PublicChrome,
  BracketLabel,
  Meta,
  HazardBar,
} from "@/components/industrial";

export default function HomePage() {
  const locale = "en" as const;
  return (
    <PublicChrome
      brand={t(locale, "brand")}
      right={
        <nav className="meta flex flex-wrap items-center gap-4">
          <Link href="/verify-document">{t(locale, "nav.verify")}</Link>
          <Link href="/login">
            <Button variant="primary">{t(locale, "nav.login")}</Button>
          </Link>
        </nav>
      }
    >
      <section className="border-2 border-[var(--ink)] bg-[var(--bg)]">
        <div className="border-b-2 border-[var(--ink)] bg-[var(--bg-alt)] px-4 py-3 md:px-6">
          <BracketLabel>{t(locale, "hero.frame")}</BracketLabel>
        </div>
        <div className="grid gap-0 md:grid-cols-[1.4fr_0.6fr]">
          <div className="border-b-2 border-[var(--ink)] p-6 md:border-b-0 md:border-r-2 md:p-10">
            <Meta className="mb-4 block text-[var(--accent)]">
              {'>>> '} {t(locale, "brand")}
            </Meta>
            <h1 className="h-macro max-w-4xl text-[clamp(2.75rem,9vw,7rem)] text-[var(--ink-deep)]">
              {t(locale, "tagline")}
            </h1>
            <p className="meta mt-6 max-w-2xl normal-case tracking-[0.04em] text-[var(--muted)]">
              {t(locale, "hero.security")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login">
                <Button variant="danger">{t(locale, "hero.cta")}</Button>
              </Link>
              <Link href="/verify-document">
                <Button variant="outline">{t(locale, "nav.verify")}</Button>
              </Link>
            </div>
          </div>
          <aside className="flex flex-col justify-between gap-6 bg-[var(--bg-alt)] p-6">
            <div>
              <Meta className="mb-3 block">+ DOC / SPEC</Meta>
              <dl className="space-y-3">
                <div>
                  <dt className="meta text-[var(--muted)]">REV</dt>
                  <dd className="h-display text-3xl">2.6</dd>
                </div>
                <div>
                  <dt className="meta text-[var(--muted)]">UNIT</dt>
                  <dd className="h-display text-3xl">NW / NQ</dd>
                </div>
                <div>
                  <dt className="meta text-[var(--muted)]">CLASS</dt>
                  <dd className="text-[0.8rem] text-[var(--accent)]">RESTRICTED OPS</dd>
                </div>
              </dl>
            </div>
            <HazardBar />
          </aside>
        </div>
      </section>

      <section className="mt-8 border-2 border-[var(--ink)] p-6 md:p-8">
        <BracketLabel>OPS BRIEF</BracketLabel>
        <h2 className="h-macro mt-3 text-[clamp(1.75rem,4vw,3rem)]">
          {t(locale, "hero.sectionOps")}
        </h2>
        <hr className="rule-accent my-4" />
        <p className="meta max-w-3xl normal-case tracking-[0.04em] text-[var(--muted)]">
          {t(locale, "hero.sectionOpsBody")}
        </p>
      </section>
    </PublicChrome>
  );
}

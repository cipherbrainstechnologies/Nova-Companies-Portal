import Link from "next/link";
import { t } from "@/i18n";

export default function HomePage() {
  const locale = "en" as const;
  return (
    <main>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="h-display text-xl font-bold text-[var(--hero-deep)]">{t(locale, "brand")}</div>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/verify-document" className="text-[var(--muted)] hover:text-[var(--ink)]">
            {t(locale, "nav.verify")}
          </Link>
          <Link
            href="/login"
            className="rounded-md bg-[var(--ink)] px-4 py-2 text-[var(--paper)] hover:bg-[var(--ink-soft)]"
          >
            {t(locale, "nav.login")}
          </Link>
        </nav>
      </header>

      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "linear-gradient(135deg, var(--hero-deep) 0%, var(--hero-mid) 48%, #1a7a68 100%)",
          }}
        />
        <div
          className="absolute inset-0 -z-10 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(198,161,91,.35), transparent 35%), radial-gradient(circle at 80% 0%, rgba(255,255,255,.12), transparent 40%)",
          }}
        />
        <div className="mx-auto flex min-h-[78vh] max-w-6xl flex-col justify-center px-6 py-16 text-[var(--paper)]">
          <p className="mb-4 max-w-xl text-sm text-[var(--accent-soft)]">{t(locale, "brand")}</p>
          <h1 className="h-display max-w-3xl text-4xl font-bold leading-tight md:text-6xl">
            {t(locale, "tagline")}
          </h1>
          <p className="mt-5 max-w-2xl text-base text-[var(--paper-soft)] md:text-lg">
            {t(locale, "hero.security")}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="rounded-md bg-[var(--hero-glow)] px-5 py-3 text-sm font-semibold text-[var(--hero-deep)]"
            >
              {t(locale, "hero.cta")}
            </Link>
            <Link
              href="/verify-document"
              className="rounded-md border border-[var(--paper-soft)]/40 px-5 py-3 text-sm"
            >
              {t(locale, "nav.verify")}
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="h-display text-3xl font-bold">Built for Indian multi-entity payroll ops</h2>
        <p className="mt-3 max-w-2xl text-[var(--muted)]">
          Statement reconciliation, human-approved matches, immutable issued slips, and profit views that never confuse bank balance with earned operating profit.
        </p>
      </section>
    </main>
  );
}

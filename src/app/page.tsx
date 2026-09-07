import Link from "next/link";
import { t } from "@/i18n";
import { Button } from "@/components/ui";
import { PublicChrome, BracketLabel } from "@/components/industrial";

export default function HomePage() {
  const locale = "en" as const;
  return (
    <PublicChrome
      brand={t(locale, "brand")}
      right={
        <nav className="flex flex-wrap items-center gap-2 md:gap-3">
          <Link
            href="/verify-document"
            className="inline-flex min-h-10 items-center rounded-full px-3 text-sm font-medium text-[var(--nova-text-secondary)] hover:text-[var(--nova-teal)]"
          >
            {t(locale, "nav.verify")}
          </Link>
          <Link href="/login">
            <Button size="sm">{t(locale, "nav.login")}</Button>
          </Link>
        </nav>
      }
    >
      <section className="overflow-hidden rounded-[var(--nova-radius-lg)] border border-[var(--nova-border)] bg-[var(--nova-surface)] shadow-[var(--nova-shadow-md)]">
        <div className="grid gap-0 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="p-6 md:p-10 lg:p-12">
            <BracketLabel>{t(locale, "brand")}</BracketLabel>
            <h1 className="h-macro mt-4 max-w-3xl text-[clamp(2rem,5vw,3.5rem)]">
              {t(locale, "hero.problemTitle")}
            </h1>
            <p className="mt-4 max-w-xl text-base text-[var(--nova-text-secondary)]">
              {t(locale, "hero.problemBody")}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/login/admin">
                <Button size="lg">{t(locale, "hero.ctaAdmin")}</Button>
              </Link>
              <Link href="/login/employee">
                <Button size="lg" variant="outline">
                  {t(locale, "hero.ctaEmployee")}
                </Button>
              </Link>
            </div>
          </div>
          <aside className="border-t border-[var(--nova-border)] bg-[var(--nova-ink)] p-6 text-white md:p-8 lg:border-l lg:border-t-0">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-white/60">
              Built for payroll ops
            </p>
            <ul className="mt-6 space-y-5">
              {[t(locale, "hero.point1"), t(locale, "hero.point2"), t(locale, "hero.point3")].map(
                (point, i) => (
                  <li key={point} className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--nova-teal)] text-xs font-bold">
                      {i + 1}
                    </span>
                    <span className="text-sm leading-relaxed text-white/90">{point}</span>
                  </li>
                ),
              )}
            </ul>
          </aside>
        </div>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-3">
        {[
          ["Payslip folders", t(locale, "hero.folderPayslips")],
          ["Profit clarity", t(locale, "hero.folderProfit")],
          ["Traceable math", t(locale, "hero.folderMath")],
        ].map(([title, body]) => (
          <article
            key={title}
            className="rounded-[var(--nova-radius)] border border-[var(--nova-border)] bg-[var(--nova-surface)] p-5 shadow-[var(--nova-shadow)]"
          >
            <h2 className="text-base font-bold text-[var(--nova-ink)]">{title}</h2>
            <p className="mt-2 text-sm text-[var(--nova-muted)]">{body}</p>
          </article>
        ))}
      </section>
    </PublicChrome>
  );
}

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
        <nav className="meta flex flex-wrap items-center gap-3 md:gap-4">
          <Link href="/verify-document" className="min-h-12 inline-flex items-center">
            {t(locale, "nav.verify")}
          </Link>
          <Link href="/login">
            <Button variant="primary" className="min-h-12">{t(locale, "nav.login")}</Button>
          </Link>
        </nav>
      }
    >
      <section className="border-2 border-[var(--ink)] bg-[var(--bg)]">
        <div className="border-b-2 border-[var(--ink)] bg-[var(--bg-alt)] px-4 py-3 md:px-6">
          <BracketLabel>{t(locale, "hero.frame")}</BracketLabel>
        </div>
        <div className="grid gap-0 lg:grid-cols-[1.45fr_0.55fr]">
          <div className="border-b-2 border-[var(--ink)] p-5 md:border-b-0 md:border-r-2 md:p-10">
            <Meta className="mb-4 block text-[var(--accent)]">
              {">>> "}
              {t(locale, "brand")}
            </Meta>
            <h1 className="h-macro max-w-4xl text-[clamp(2.4rem,8vw,6.5rem)] text-[var(--ink-deep)]">
              {t(locale, "hero.problemTitle")}
            </h1>
            <p className="meta mt-6 max-w-2xl normal-case tracking-[0.04em] text-[var(--muted)]">
              {t(locale, "hero.problemBody")}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href="/login/admin" className="sm:flex-1">
                <Button variant="danger" className="min-h-12 w-full">
                  {t(locale, "hero.ctaAdmin")}
                </Button>
              </Link>
              <Link href="/login/employee" className="sm:flex-1">
                <Button variant="outline" className="min-h-12 w-full">
                  {t(locale, "hero.ctaEmployee")}
                </Button>
              </Link>
            </div>
          </div>
          <aside className="flex flex-col justify-between gap-6 bg-[var(--bg-alt)] p-5 md:p-6">
            <div>
              <Meta className="mb-3 block">+ LIVE PROBLEM SET</Meta>
              <ul className="space-y-4">
                <li>
                  <div className="meta text-[var(--muted)]">01</div>
                  <div className="text-[0.8rem]">{t(locale, "hero.point1")}</div>
                </li>
                <li>
                  <div className="meta text-[var(--muted)]">02</div>
                  <div className="text-[0.8rem]">{t(locale, "hero.point2")}</div>
                </li>
                <li>
                  <div className="meta text-[var(--muted)]">03</div>
                  <div className="text-[0.8rem]">{t(locale, "hero.point3")}</div>
                </li>
              </ul>
            </div>
            <HazardBar />
          </aside>
        </div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          ["FOLDER / PAYSLIPS", t(locale, "hero.folderPayslips")],
          ["FOLDER / PROFIT", t(locale, "hero.folderProfit")],
          ["MATH / TRACEABLE", t(locale, "hero.folderMath")],
        ].map(([k, body]) => (
          <article key={k} className="border-2 border-[var(--ink)] p-5">
            <BracketLabel>{k}</BracketLabel>
            <p className="meta mt-4 normal-case tracking-[0.04em] text-[var(--muted)]">{body}</p>
          </article>
        ))}
      </section>
    </PublicChrome>
  );
}

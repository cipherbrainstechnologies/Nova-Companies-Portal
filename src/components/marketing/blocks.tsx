import Link from "next/link";

const primary =
  "mkt-btn-on-dark inline-flex min-h-[3rem] items-center justify-center rounded-[var(--mkt-radius-pill)] bg-[var(--mkt-accent)] px-7 text-[0.95rem] font-semibold text-white shadow-sm transition-colors hover:bg-[var(--mkt-accent-hover)] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mkt-accent)]";
const outline =
  "inline-flex min-h-[3rem] items-center justify-center rounded-[var(--mkt-radius-pill)] border border-[var(--mkt-border)] bg-[var(--mkt-white)] px-7 text-[0.95rem] font-semibold text-[var(--mkt-text)] transition-colors hover:border-[var(--mkt-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mkt-accent)]";
const inverse =
  "mkt-btn-light inline-flex min-h-[3rem] items-center justify-center rounded-[var(--mkt-radius-pill)] bg-white px-7 text-[0.95rem] font-semibold text-[var(--mkt-dark)] hover:bg-[var(--mkt-soft-bg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";
const darkOutline =
  "mkt-btn-on-dark inline-flex min-h-[3rem] items-center justify-center rounded-[var(--mkt-radius-pill)] border border-white/55 bg-transparent px-7 text-[0.95rem] font-semibold text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";
const heroPrimary =
  "mkt-btn-light inline-flex min-h-12 items-center justify-center rounded-[var(--mkt-radius-pill)] bg-white px-6 text-base font-semibold text-[var(--nova-navy)] shadow-sm transition-colors hover:bg-[var(--nova-purple-light)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";
const heroSecondary =
  "mkt-btn-on-dark inline-flex min-h-12 items-center justify-center rounded-[var(--mkt-radius-pill)] border border-white/80 bg-white/10 px-6 text-base font-semibold text-white transition-colors hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

export function MarketingLink({
  href,
  children,
  variant = "primary",
  className: extraClass,
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "outline" | "inverse" | "darkOutline" | "heroPrimary" | "heroSecondary";
  className?: string;
}) {
  const className =
    variant === "outline"
      ? outline
      : variant === "inverse"
        ? inverse
        : variant === "darkOutline"
          ? darkOutline
          : variant === "heroPrimary"
            ? heroPrimary
            : variant === "heroSecondary"
              ? heroSecondary
              : primary;
  return (
    <Link href={href} className={extraClass ? `${className} ${extraClass}` : className}>
      {children}
    </Link>
  );
}

export function PageIntro({
  kicker,
  title,
  lede,
}: {
  kicker: string;
  title: string;
  lede: string;
}) {
  return (
    <header className="max-w-3xl">
      <p className="mkt-eyebrow">{kicker}</p>
      <h1 className="mkt-h1 mt-4">{title}</h1>
      <p className="mkt-lead mt-5">{lede}</p>
    </header>
  );
}

export function ClosingBand({
  title,
  body,
  action,
  href = "/contact",
  secondaryAction,
  secondaryHref = "/contact",
  dark = true,
}: {
  title: string;
  body?: string;
  action: string;
  href?: string;
  secondaryAction?: string;
  secondaryHref?: string;
  dark?: boolean;
}) {
  if (!dark) {
    return (
      <section className="mkt-section">
        <div className="mkt-container rounded-[var(--mkt-radius-lg)] bg-[var(--mkt-soft-bg)] px-6 py-12 md:px-12">
          <h2 className="mkt-h2 max-w-2xl">{title}</h2>
          {body ? <p className="mkt-lead mt-4 max-w-2xl">{body}</p> : null}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <MarketingLink href={href}>{action}</MarketingLink>
            {secondaryAction ? <MarketingLink href={secondaryHref} variant="outline">{secondaryAction}</MarketingLink> : null}
          </div>
        </div>
      </section>
    );
  }
  return (
    <section className="mkt-section">
      <div className="mkt-container overflow-hidden rounded-[var(--mkt-radius-lg)] bg-[var(--mkt-dark)] px-6 py-14 text-white md:px-12 md:py-16">
        <h2 className="mkt-h2 max-w-2xl text-white">{title}</h2>
        {body ? <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/75">{body}</p> : null}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <MarketingLink href={href} variant="inverse">{action}</MarketingLink>
          {secondaryAction ? (
            <MarketingLink href={secondaryHref} variant="darkOutline">{secondaryAction}</MarketingLink>
          ) : null}
        </div>
      </div>
    </section>
  );
}

import Link from "next/link";

const primary =
  "inline-flex min-h-12 items-center justify-center rounded-[var(--nova-radius-sm)] bg-[var(--nova-teal)] px-5 text-[0.95rem] font-semibold text-white shadow-sm hover:bg-[#0d5f58] hover:text-white";
const outline =
  "inline-flex min-h-12 items-center justify-center rounded-[var(--nova-radius-sm)] border border-[var(--nova-border-strong)] bg-[var(--nova-surface)] px-5 text-[0.95rem] font-semibold text-[var(--nova-text)] hover:border-[var(--nova-teal)] hover:text-[var(--nova-teal)]";
const inverse =
  "inline-flex min-h-12 items-center justify-center rounded-[var(--nova-radius-sm)] bg-white px-5 text-[0.95rem] font-semibold text-[var(--nova-ink)] hover:bg-[var(--nova-teal-soft)] hover:text-[var(--nova-ink)]";

export function MarketingLink({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "outline" | "inverse";
}) {
  const className = variant === "outline" ? outline : variant === "inverse" ? inverse : primary;
  return (
    <Link href={href} className={className}>
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
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--nova-teal)]">{kicker}</p>
      <h1 className="h-macro mt-3 text-[clamp(2.1rem,5vw,3.6rem)]">{title}</h1>
      <p className="mt-4 text-lg leading-relaxed text-[var(--nova-text-secondary)]">{lede}</p>
    </header>
  );
}

export function ClosingBand({
  title,
  body,
  action,
  href = "/contact",
}: {
  title: string;
  body: string;
  action: string;
  href?: string;
}) {
  return (
    <section className="mt-16 rounded-[var(--nova-radius-lg)] bg-[var(--nova-ink)] px-6 py-10 text-white md:px-10">
      <h2 className="h-display max-w-2xl text-[clamp(1.6rem,3vw,2.2rem)] text-white">{title}</h2>
      <p className="mt-3 max-w-2xl text-white/80">{body}</p>
      <div className="mt-6">
        <MarketingLink href={href} variant="inverse">
          {action}
        </MarketingLink>
      </div>
    </section>
  );
}

import type { ReactNode } from "react";
import Link from "next/link";

export function MarketingSection({
  id,
  title,
  lede,
  children,
  className,
}: {
  id?: string;
  title: string;
  lede?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={className ?? "mkt-section"} aria-labelledby={id ? `${id}-heading` : undefined}>
      <h2
        id={id ? `${id}-heading` : undefined}
        className="h-display text-[clamp(1.6rem,3vw,2.15rem)] text-[var(--nova-ink)]"
      >
        {title}
      </h2>
      {lede ? <p className="mt-3 max-w-2xl text-[var(--nova-text-secondary)] leading-relaxed">{lede}</p> : null}
      <div className="mt-8">{children}</div>
    </section>
  );
}

export function IconBadge({ label }: { label: string }) {
  return (
    <span
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--nova-teal-soft)] text-sm font-bold text-[var(--nova-teal)]"
      aria-hidden
    >
      {label.slice(0, 1)}
    </span>
  );
}

export function SurfaceCard({
  title,
  children,
  href,
}: {
  title: string;
  children: ReactNode;
  href?: string;
}) {
  const body = (
    <article className="flex h-full flex-col rounded-[var(--mkt-radius)] border border-[var(--mkt-border)] bg-[var(--mkt-surface)] p-6 shadow-sm transition-shadow hover:shadow-[var(--mkt-shadow)]">
      <h3 className="font-bold text-[var(--nova-ink)]">{title}</h3>
      <div className="mt-2 flex-1 text-sm leading-relaxed text-[var(--nova-text-secondary)]">{children}</div>
    </article>
  );
  if (href) {
    return (
      <Link
        href={href}
        className="block h-full rounded-[var(--mkt-radius)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--nova-teal)]"
      >
        {body}
      </Link>
    );
  }
  return body;
}

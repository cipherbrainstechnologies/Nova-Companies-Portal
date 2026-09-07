import Link from "next/link";
import { cn } from "@/lib/utils";

/** @deprecated visual — kept as subtle brand accent strip for public pages */
export function HazardBar({ className }: { className?: string }) {
  return (
    <div
      className={cn("h-1 w-full bg-gradient-to-r from-[var(--nova-ink)] via-[var(--nova-teal)] to-[var(--nova-teal-soft)]", className)}
      aria-hidden
    />
  );
}

export function Meta({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <p className={cn("meta", className)}>{children}</p>;
}

export function BracketLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[var(--nova-teal-soft)] px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[var(--nova-teal)]">
      {children}
    </span>
  );
}

export function UnitStamp({
  rev = "3.0",
  unit = "PAYROLL",
}: {
  rev?: string;
  unit?: string;
}) {
  return (
    <div className="meta flex flex-wrap gap-x-3 gap-y-1">
      <span>Nova · {unit}</span>
      <span>v{rev}</span>
    </div>
  );
}

export function PageHeader({
  kicker,
  title,
  meta,
  description,
  actions,
}: {
  kicker?: string;
  title: string;
  meta?: React.ReactNode;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 border-b border-[var(--nova-border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {kicker ? <BracketLabel>{kicker}</BracketLabel> : null}
        <h1 className="h-macro mt-2 text-[clamp(1.75rem,3vw,2.25rem)]">{title}</h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm text-[var(--nova-text-secondary)]">{description}</p>
        ) : null}
        {meta ? <div className="mt-2">{meta}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function StatCell({
  label,
  value,
  alert,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  alert?: boolean;
  hint?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--nova-radius)] border bg-[var(--nova-surface)] p-4 shadow-[var(--nova-shadow)]",
        alert ? "border-[var(--nova-warning)]/40 bg-[var(--nova-warning-soft)]" : "border-[var(--nova-border)]",
      )}
    >
      <div className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--nova-muted)]">
        {label}
      </div>
      <div
        className={cn(
          "mt-2 text-[clamp(1.5rem,3vw,2rem)] font-bold tabular-nums leading-none tracking-tight",
          alert ? "text-[var(--nova-warning)]" : "text-[var(--nova-ink)]",
        )}
      >
        {value}
      </div>
      {hint ? <p className="mt-2 text-xs text-[var(--nova-muted)]">{hint}</p> : null}
    </div>
  );
}

export function DataRow({
  title,
  subtitle,
  action,
  leading,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  leading?: React.ReactNode;
}) {
  return (
    <article className="flex items-start gap-3 rounded-[var(--nova-radius)] border border-[var(--nova-border)] bg-[var(--nova-surface)] p-4 shadow-[var(--nova-shadow)]">
      {leading}
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-[var(--nova-ink)]">{title}</div>
        {subtitle ? <div className="mt-1 text-sm text-[var(--nova-muted)]">{subtitle}</div> : null}
      </div>
      {action ? <div className="shrink-0 self-center">{action}</div> : null}
    </article>
  );
}

export function CompanyTabs({
  companies,
  activeId,
  hrefFor,
}: {
  companies: Array<{ id: string; name: string; prefix?: string }>;
  activeId?: string;
  hrefFor: (id: string) => string;
}) {
  return (
    <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Company">
      {companies.map((c) => {
        const active = c.id === activeId;
        return (
          <Link
            key={c.id}
            href={hrefFor(c.id)}
            role="tab"
            aria-selected={active}
            className={cn(
              "rounded-full border px-3.5 py-2 text-sm font-medium transition-colors",
              active
                ? "border-[var(--nova-teal)] bg-[var(--nova-teal)] text-white"
                : "border-[var(--nova-border)] bg-[var(--nova-surface)] text-[var(--nova-text-secondary)] hover:border-[var(--nova-teal)] hover:text-[var(--nova-teal)]",
            )}
          >
            {c.prefix ? `${c.prefix} · ` : ""}
            {c.name}
          </Link>
        );
      })}
    </div>
  );
}

export function PublicChrome({
  children,
  brand,
  right,
}: {
  children: React.ReactNode;
  brand: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <HazardBar />
      <div className="mx-auto max-w-6xl px-4 py-5 md:px-6 md:py-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <div className="h-display text-xl text-[var(--nova-ink)] md:text-2xl">{brand}</div>
            <p className="meta mt-1">Secure payroll &amp; salary slips</p>
          </div>
          {right}
        </div>
        {children}
      </div>
    </div>
  );
}

export function StatusBadge({
  status,
  tone = "neutral",
}: {
  status: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  const tones = {
    neutral: "bg-[var(--nova-surface-muted)] text-[var(--nova-text-secondary)]",
    success: "bg-[var(--nova-success-soft)] text-[var(--nova-success)]",
    warning: "bg-[var(--nova-warning-soft)] text-[var(--nova-warning)]",
    danger: "bg-[var(--nova-danger-soft)] text-[var(--nova-danger)]",
    info: "bg-[var(--nova-info-soft)] text-[var(--nova-info)]",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        tones[tone],
      )}
    >
      {status}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-[var(--nova-radius)] border border-dashed border-[var(--nova-border-strong)] bg-[var(--nova-surface)] px-6 py-12 text-center">
      <h3 className="text-base font-semibold text-[var(--nova-ink)]">{title}</h3>
      {description ? (
        <p className="mx-auto mt-2 max-w-md text-sm text-[var(--nova-muted)]">{description}</p>
      ) : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function MoneyValue({
  value,
  className,
}: {
  value: number | string;
  className?: string;
}) {
  const n = typeof value === "number" ? value : Number(value);
  const formatted = Number.isFinite(n)
    ? n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : String(value);
  return <span className={cn("tabular-nums font-semibold", className)}>₹{formatted}</span>;
}

export function AlertBanner({
  children,
  tone = "info",
}: {
  children: React.ReactNode;
  tone?: "info" | "warning" | "danger" | "success";
}) {
  const map = {
    info: "border-[var(--nova-info)]/25 bg-[var(--nova-info-soft)] text-[var(--nova-info)]",
    warning: "border-[var(--nova-warning)]/25 bg-[var(--nova-warning-soft)] text-[var(--nova-warning)]",
    danger: "border-[var(--nova-danger)]/25 bg-[var(--nova-danger-soft)] text-[var(--nova-danger)]",
    success: "border-[var(--nova-success)]/25 bg-[var(--nova-success-soft)] text-[var(--nova-success)]",
  };
  return (
    <div className={cn("rounded-[var(--nova-radius)] border px-4 py-3 text-sm", map[tone])}>
      {children}
    </div>
  );
}

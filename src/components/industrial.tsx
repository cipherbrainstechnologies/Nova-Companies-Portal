import { cn } from "@/lib/utils";

export function HazardBar({ className }: { className?: string }) {
  return <div className={cn("hazard-bar w-full", className)} aria-hidden />;
}

export function Meta({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <samp className={cn("meta", className)}>{children}</samp>;
}

export function BracketLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="meta text-[var(--ink)]">
      [ {children} ]
    </span>
  );
}

export function UnitStamp({
  rev = "2.6",
  unit = "D-01",
}: {
  rev?: string;
  unit?: string;
}) {
  return (
    <div className="meta flex flex-wrap gap-x-4 gap-y-1 text-[var(--muted)]">
      <span>REV {rev}</span>
      <span>UNIT / {unit}</span>
      <span>DOC® NOVA</span>
    </div>
  );
}

export function PageHeader({
  kicker,
  title,
  meta,
}: {
  kicker?: string;
  title: string;
  meta?: React.ReactNode;
}) {
  return (
    <header className="mb-6 border-b-2 border-[var(--ink)] pb-4">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <BracketLabel>{kicker ?? "SYSTEM"}</BracketLabel>
        <UnitStamp />
      </div>
      <h1 className="h-macro text-[clamp(2.25rem,6vw,4.5rem)] text-[var(--ink-deep)]">
        {title}
      </h1>
      {meta ? <div className="mt-3">{meta}</div> : null}
      <hr className="rule-accent mt-4" />
    </header>
  );
}

export function StatCell({
  label,
  value,
  alert,
}: {
  label: string;
  value: React.ReactNode;
  alert?: boolean;
}) {
  return (
    <div className="border-2 border-[var(--ink)] bg-[var(--bg)] p-4">
      <div className="meta mb-3 flex items-center gap-2">
        <span className="text-[var(--accent)]">+</span>
        <span>{label}</span>
      </div>
      <output
        className={cn(
          "h-macro block text-[clamp(2rem,5vw,3.5rem)] leading-none",
          alert ? "text-[var(--accent)]" : "text-[var(--ink-deep)]",
        )}
      >
        {value}
      </output>
    </div>
  );
}

export function DataRow({
  title,
  subtitle,
  action,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <article className="grid grid-cols-[1fr_auto] gap-3 border-2 border-[var(--ink)] bg-[var(--bg)] p-4">
      <div>
        <div className="text-[0.8rem] font-normal tracking-[0.06em] text-[var(--ink-deep)]">
          {title}
        </div>
        {subtitle ? <div className="meta mt-2">{subtitle}</div> : null}
      </div>
      {action ? <div className="self-center">{action}</div> : null}
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
    <div className="mb-4 flex flex-wrap gap-0 border-2 border-[var(--ink)]">
      {companies.map((c, i) => {
        const active = c.id === activeId;
        return (
          <a
            key={c.id}
            href={hrefFor(c.id)}
            className={cn(
              "meta border-[var(--ink)] px-3 py-2",
              i > 0 && "border-l-2",
              active
                ? "bg-[var(--ink)] text-[var(--on-accent)]"
                : "bg-[var(--bg-alt)] text-[var(--ink)] hover:text-[var(--accent)]",
            )}
          >
            {c.prefix ? `${c.prefix} / ` : ""}
            {c.name}
          </a>
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
      <div className="mx-auto max-w-6xl px-4 py-4 md:px-6">
        <div className="mb-6 flex items-start justify-between gap-4 border-b-2 border-[var(--ink)] pb-3">
          <div>
            <div className="h-display text-xl md:text-2xl">{brand}</div>
            <UnitStamp unit="PUB-01" />
          </div>
          {right}
        </div>
        {children}
      </div>
    </div>
  );
}

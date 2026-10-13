export function HeroDashboardVisual() {
  return (
    <div
      className="relative mx-auto mt-10 max-w-4xl overflow-hidden rounded-[var(--mkt-radius-lg)] border border-[var(--mkt-border)] bg-[var(--mkt-soft-bg)] p-4 shadow-[var(--mkt-shadow)] md:p-6"
      role="img"
      aria-label="Illustrative workforce administration preview with onboarding, payroll and documentation status"
    >
      <p className="text-center text-xs font-medium uppercase tracking-wide text-[var(--mkt-text-secondary)]">
        Illustrative preview — not live customer data
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Panel title="Onboarding" rows={["Engineer — Docs received", "Designer — Contract pending", "Analyst — Not started"]} />
        <Panel title="March payroll" rows={["Gross inputs — Approved", "Statutory review — In progress", "Payslip issue — Scheduled"]} accent />
        <Panel title="Documentation" rows={["Employment agreement — Signed", "Tax declarations — Complete", "Bank details — Verified"]} />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-[var(--mkt-text-secondary)]">
        <span className="rounded-full bg-white px-3 py-1 border border-[var(--mkt-border)]">India workforce overview</span>
        <span className="rounded-full bg-white px-3 py-1 border border-[var(--mkt-border)]">Benefits coordination</span>
      </div>
    </div>
  );
}

function Panel({ title, rows, accent }: { title: string; rows: string[]; accent?: boolean }) {
  return (
    <div
      className={`rounded-[var(--mkt-radius)] border p-4 ${accent ? "border-[var(--mkt-accent)]/30 bg-white" : "border-[var(--mkt-border)] bg-white"}`}
    >
      <p className="text-sm font-bold text-[var(--mkt-text)]">{title}</p>
      <ul className="mt-3 space-y-2 text-xs text-[var(--mkt-text-secondary)]">
        {rows.map((row) => (
          <li key={row} className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--mkt-accent)]" aria-hidden />
            {row}
          </li>
        ))}
      </ul>
    </div>
  );
}

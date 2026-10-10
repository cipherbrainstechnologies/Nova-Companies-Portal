import type { SiteCopy } from "@/content/public-site";

export function CostDashboardPreview({ copy }: { copy: SiteCopy["home"]["proof"] }) {
  return (
    <section className="mt-16" aria-labelledby="proof-heading">
      <div className="max-w-3xl">
        <h2 id="proof-heading" className="h-display text-[clamp(1.6rem,3vw,2.15rem)]">
          {copy.heading}
        </h2>
        <p className="mt-2 text-[var(--nova-text-secondary)]">{copy.body}</p>
      </div>
      <div className="mkt-elevated mt-8 overflow-hidden rounded-[var(--mkt-radius-lg)] border border-[var(--mkt-border)] bg-[var(--mkt-surface)]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--mkt-border)] bg-[var(--nova-surface-muted)] px-4 py-3">
          <p className="text-sm font-semibold text-[var(--nova-ink)]">{copy.panelTitle}</p>
          <span className="rounded-full bg-[var(--nova-warning-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--nova-warning)]">
            {copy.illustrativeLabel}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
            <caption className="sr-only">{copy.panelTitle}</caption>
            <thead>
              <tr className="border-b border-[var(--mkt-border)] text-xs uppercase tracking-wide text-[var(--nova-muted)]">
                {copy.columns.map((col) => (
                  <th key={col} scope="col" className="px-4 py-3 font-semibold">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {copy.rows.map((row) => (
                <tr key={row.role} className="border-b border-[var(--mkt-border)] last:border-0">
                  <th scope="row" className="px-4 py-3 font-medium text-[var(--nova-ink)]">{row.role}</th>
                  <td className="tabular-nums px-4 py-3 text-[var(--nova-text-secondary)]">{row.gross}</td>
                  <td className="tabular-nums px-4 py-3 text-[var(--nova-text-secondary)]">{row.statutory}</td>
                  <td className="tabular-nums px-4 py-3 text-[var(--nova-text-secondary)]">{row.benefits}</td>
                  <td className="tabular-nums px-4 py-3 text-[var(--nova-text-secondary)]">{row.fee}</td>
                  <td className="px-4 py-3 text-[var(--nova-text-secondary)]">{row.invoice}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[var(--nova-surface-muted)] font-semibold text-[var(--nova-ink)]">
                <th scope="row" className="px-4 py-3">{copy.totalLabel}</th>
                <td className="tabular-nums px-4 py-3" colSpan={5}>{copy.totalValue}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </section>
  );
}

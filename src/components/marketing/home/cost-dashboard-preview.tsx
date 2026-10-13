import type { SiteCopy } from "@/content/public-site";

type Proof = SiteCopy["home"]["proof"];

export function CostDashboardPreview({ copy, embedded = false }: { copy: Proof; embedded?: boolean }) {
  const Frame = embedded ? "div" : "section";
  return (
    <Frame className={embedded ? "" : "mt-16"} aria-labelledby={embedded ? undefined : "proof-heading"}>
      {embedded ? null : (
        <div className="max-w-3xl">
          <h2 id="proof-heading" className="mkt-h2">
            {copy.heading}
          </h2>
          <p className="mkt-lead mt-4">{copy.body}</p>
        </div>
      )}
      <div className={`overflow-hidden rounded-[1.5rem] border border-[var(--nova-border)] bg-white shadow-[0_18px_50px_rgb(12_12_50_/_0.06)] ${embedded ? "" : "mt-8"}`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--nova-border)] px-5 py-4">
          <p className="text-base font-semibold text-[var(--nova-text)]">{copy.panelTitle}</p>
          <span className="rounded-full bg-[var(--nova-purple-light)] px-3 py-1 text-xs font-semibold text-[var(--nova-purple)]">
            {copy.illustrativeLabel}
          </span>
        </div>

        <div className="space-y-3 p-4 md:hidden">
          {copy.rows.map((row) => (
            <article key={row.role} className="rounded-2xl border border-[var(--nova-border)] p-4">
              <h3 className="text-base font-semibold text-[var(--nova-text)]">{row.role}</h3>
              <dl className="mt-3 space-y-2 text-sm">
                <CostLine label={copy.columns[1]} value={row.gross} />
                <CostLine label={copy.columns[2]} value={row.statutory} />
                <CostLine label={copy.columns[3]} value={row.benefits} />
                <CostLine label={copy.columns[4]} value={row.fee} />
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[var(--nova-muted)]">{copy.columns[5]}</dt>
                  <dd><InvoicePill value={row.invoice} /></dd>
                </div>
              </dl>
            </article>
          ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
            <caption className="sr-only">{copy.panelTitle}. {copy.illustrativeLabel}.</caption>
            <thead>
              <tr className="border-b border-[var(--nova-border)] text-[var(--nova-muted)]">
                {copy.columns.map((col, index) => (
                  <th
                    key={col}
                    scope="col"
                    className={`px-4 py-3 text-[13px] font-semibold ${index > 0 && index < 5 ? "text-right" : ""}`}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {copy.rows.map((row) => (
                <tr key={row.role} className="border-b border-[var(--nova-border)] last:border-0">
                  <th scope="row" className="px-4 py-3.5 font-semibold text-[var(--nova-text)]">{row.role}</th>
                  <td className="px-4 py-3.5 text-right tabular-nums text-[var(--nova-text)]">{row.gross}</td>
                  <td className="px-4 py-3.5 text-right tabular-nums text-[var(--nova-text)]">{row.statutory}</td>
                  <td className="px-4 py-3.5 text-right tabular-nums text-[var(--nova-text)]">{row.benefits}</td>
                  <td className="px-4 py-3.5 text-right text-[var(--nova-text)]">{row.fee}</td>
                  <td className="px-4 py-3.5"><InvoicePill value={row.invoice} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-1 bg-[var(--nova-navy)] px-5 py-4 text-white sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-white/80">{copy.totalLabel}</p>
          <p className="text-lg font-bold tabular-nums">{copy.totalValue}</p>
        </div>
      </div>
    </Frame>
  );
}

function CostLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[var(--nova-muted)]">{label}</dt>
      <dd className="font-medium tabular-nums text-[var(--nova-text)]">{value}</dd>
    </div>
  );
}

function InvoicePill({ value }: { value: string }) {
  const paid = value.toLowerCase() === "paid";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        paid ? "bg-[var(--nova-purple-light)] text-[var(--nova-purple)]" : "bg-[#F4F0E4] text-[#7A5B16]"
      }`}
    >
      {value}
    </span>
  );
}

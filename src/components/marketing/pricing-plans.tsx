import { MarketingLink } from "@/components/marketing/blocks";
import {
  COMMERCIAL_PLANS,
  COMPARISON_LABEL,
  PLAN_COMPARISON,
  SEPARATE_CHARGES_NOTE,
  formatMonthlyFee,
  planEnquiryHref,
} from "@/content/public-site/commercial-plans";

export function PricingPlans() {
  return (
    <div className="mt-12">
      <div className="grid gap-4 lg:grid-cols-3">
        {COMMERCIAL_PLANS.map((plan) => (
          <article
            key={plan.id}
            className={`flex flex-col rounded-[var(--mkt-radius-lg)] border bg-[var(--mkt-surface)] p-6 md:p-7 ${
              plan.id === "managed" ? "border-[var(--nova-purple)]" : "border-[var(--mkt-border)]"
            }`}
          >
            <h2 className="text-lg font-bold text-[var(--nova-ink)]">{plan.name}</h2>
            <p className="mt-4 text-3xl font-bold tracking-tight text-[var(--nova-navy)]">{formatMonthlyFee(plan.monthlyFeeInr)}</p>
            <p className="mt-1 text-sm text-[var(--nova-muted)]">{plan.priceDetail}</p>
            <p className="mt-4 text-sm leading-relaxed text-[var(--nova-text-secondary)]">{plan.summary}</p>
            <ul className="mt-5 space-y-2 md:hidden">
              {plan.highlights.map((item) => (
                <li key={item} className="text-sm leading-relaxed text-[var(--nova-text)]">
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <MarketingLink href={planEnquiryHref(plan.id)} className="w-full">
                {plan.cta}
              </MarketingLink>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-10 hidden md:block">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="mb-3 text-left text-base font-semibold text-[var(--nova-ink)]">
            What each plan includes
          </caption>
          <thead>
            <tr className="border-b border-[var(--mkt-border)]">
              <th scope="col" className="py-3 pr-4 font-semibold text-[var(--nova-ink)]">
                Service
              </th>
              {COMMERCIAL_PLANS.map((plan) => (
                <th key={plan.id} scope="col" className="px-3 py-3 font-semibold text-[var(--nova-ink)]">
                  {plan.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PLAN_COMPARISON.map((row) => (
              <tr key={row.label} className="border-b border-[var(--mkt-border)]">
                <th scope="row" className="py-3 pr-4 font-medium text-[var(--nova-text)]">
                  {row.label}
                </th>
                {COMMERCIAL_PLANS.map((plan) => (
                  <td key={plan.id} className="px-3 py-3 text-[var(--nova-text-secondary)]">
                    {COMPARISON_LABEL[row.cells[plan.id]]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-8 max-w-3xl text-sm leading-relaxed text-[var(--nova-text-secondary)]">
        {SEPARATE_CHARGES_NOTE}
      </p>
    </div>
  );
}

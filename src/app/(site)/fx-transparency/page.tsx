import type { Metadata } from "next";
import { ClosingBand, PageIntro } from "@/components/marketing/blocks";
import { FxIllustrationCalculator } from "@/components/marketing/fx-illustration-calculator";

export const metadata: Metadata = {
  title: { absolute: "FX & payments | Nova Workforce" },
  description:
    "How Nova Workforce invoices international clients for India employment costs: INR as the underlying currency, disclosed settlement quotes, and reconciliation of bank deductions.",
  alternates: { canonical: "/fx-transparency" },
};

const PRINCIPLES = [
  {
    title: "INR is the employment-cost currency",
    body: "Salaries and Indian employment costs are calculated in Indian rupees. A foreign-currency invoice is a settlement of that rupee amount.",
  },
  {
    title: "Settlement currencies",
    body: "Client settlement can be quoted in GBP, USD, CAD, AUD, or AED. The currency is the one agreed for your invoice.",
  },
  {
    title: "The reference source is named",
    body: "A payable quote identifies the reference-rate source. This page uses a labelled sample source until an approved rate feed is connected.",
  },
  {
    title: "You see the conversion before you pay",
    body: "The quote you are asked to pay shows the conversion, the provider or bank spread, and any Nova fee as its own line. Nothing on this page is that quote.",
  },
  {
    title: "Spread and Nova fees are disclosed, not assumed here",
    body: "This illustration defaults both to zero. Nova does not publish a default FX percentage on this page. Any spread or Nova fee appears on your quote before payment.",
  },
  {
    title: "Quotes record when they were created and when they expire",
    body: "A payable quote stores a creation time and an expiry time. The calculator shows those timestamps on a 24-hour example so the fields are visible. Your quote uses the validity recorded for that quote.",
  },
  {
    title: "Settlement and payroll funding have deadlines",
    body: "The date funds must arrive, and the payroll-funding cutoff, are set in your proposal. Statutory payroll dates take priority over commercial cutoffs.",
  },
  {
    title: "Shortfalls and bank deductions are reconciled",
    body: "If the amount received is short of the quoted settlement because the bank deducted charges, or the converted rupees do not cover the funded payroll, the difference is recorded and reconciled before payroll is treated as fully funded.",
  },
];

export default function FxPaymentsPage() {
  return (
    <>
      <PageIntro
        kicker="FX & payments"
        title="How international invoices are quoted"
        lede="India employment costs sit in INR. When you settle in another currency, the quote you pay shows the reference source, the conversion, any spread, and any Nova fee before payment."
      />
      <ol className="mt-12 space-y-6">
        {PRINCIPLES.map((item, index) => (
          <li key={item.title} className="grid gap-2 border-t border-[var(--mkt-border)] pt-6 md:grid-cols-[4rem_1fr]">
            <p className="text-sm font-bold text-[var(--nova-purple)]">{String(index + 1).padStart(2, "0")}</p>
            <div>
              <h2 className="text-lg font-bold text-[var(--nova-ink)]">{item.title}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--nova-text-secondary)]">{item.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <FxIllustrationCalculator />
      <section className="mt-12 max-w-3xl space-y-4 text-sm leading-relaxed text-[var(--nova-text-secondary)]">
        <h2 className="text-lg font-bold text-[var(--nova-ink)]">What this page does not promise</h2>
        <p>
          The rates in the calculator are mock samples for layout and rounding. They are not a live market rate, an executable bank or provider rate, or a guaranteed forward rate.
        </p>
        <p>
          Historic Axis arrangements are entity-specific and are not guaranteed for future settlements. Invoices for a real engagement show the reference rate source, the quote timestamp, the agreed spread if any, and third-party bank charges.
        </p>
        <p>
          The employment-cost worksheet on the pricing page may show an indicative planning conversion. That worksheet is not your invoice rate.
        </p>
      </section>
      <ClosingBand
        title="Ask for a settlement quote before you fund payroll"
        body="Tell us the employment cost in INR and the currency you want to settle in. We reply with the quote path for that engagement."
        action="Request a settlement quote"
        href="/contact?topic=eor"
      />
    </>
  );
}

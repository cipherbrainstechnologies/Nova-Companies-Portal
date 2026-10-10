import type { Metadata } from "next";
import { MarketingLink } from "@/components/marketing/blocks";

export const metadata: Metadata = {
  title: "How it works | NOVA EOR",
  description: "From business verification to managed India hires, payroll, and invoicing.",
};

const STEPS = [
  "Tell us about your India hiring plans",
  "Complete business verification and agreements",
  "Submit candidates for NOVA review",
  "NOVA verifies documents and employs them",
  "Manage work and approvals in the portal",
  "Track payroll, invoices, and employer costs",
];

export default function HowItWorksPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-6 py-8">
      <h1 className="text-4xl font-bold">How it works</h1>
      <ol className="list-decimal space-y-3 pl-5 text-[var(--nova-text-secondary)]">
        {STEPS.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
      <MarketingLink href="/employer-of-record-india">Get an employee cost estimate</MarketingLink>
    </article>
  );
}

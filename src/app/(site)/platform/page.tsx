import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NOVA platform | NOVA",
  description: "Unified client portal for hires, payroll inputs, costs, and invoices.",
};

export default function Page() {
  return (
    <article className="mx-auto max-w-3xl space-y-4 py-8">
      <h1 className="text-4xl font-bold">NOVA platform</h1>
      <p className="text-[var(--nova-text-secondary)]">Unified client portal for hires, payroll inputs, costs, and invoices.</p>
    </article>
  );
}

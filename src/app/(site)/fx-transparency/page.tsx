import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FX transparency | NOVA",
  description: "Disclosed reference rates, timestamps, and bank charges for client settlements.",
};

export default function FxTransparencyPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-4 py-8">
      <h1 className="text-4xl font-bold">FX transparency</h1>
      <p className="text-[var(--nova-text-secondary)]">
        Invoices show the reference rate source, quote timestamp, agreed spread (if any), and third-party bank charges.
        Historic Axis arrangements are entity-specific and never guaranteed for future settlements.
      </p>
    </article>
  );
}

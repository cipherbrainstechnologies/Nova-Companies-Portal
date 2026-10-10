import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compliance | NOVA",
  description: "India employment compliance is entity- and state-specific; NOVA validates with counsel before activation.",
};

export default function Page() {
  return (
    <article className="mx-auto max-w-3xl space-y-4 py-8">
      <h1 className="text-4xl font-bold">Compliance</h1>
      <p className="text-[var(--nova-text-secondary)]">India employment compliance is entity- and state-specific; NOVA validates with counsel before activation.</p>
    </article>
  );
}

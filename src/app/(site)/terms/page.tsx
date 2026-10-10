import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of service | NOVA",
  description: "Commercial terms are defined in executed client agreements.",
};

export default function Page() {
  return (
    <article className="mx-auto max-w-3xl space-y-4 py-8">
      <h1 className="text-4xl font-bold">Terms of service</h1>
      <p className="text-[var(--nova-text-secondary)]">Commercial terms are defined in executed client agreements.</p>
    </article>
  );
}

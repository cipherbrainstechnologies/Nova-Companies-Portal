import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie notice | NOVA",
  description: "Essential cookies only for authenticated sessions unless analytics consent is enabled.",
};

export default function Page() {
  return (
    <article className="mx-auto max-w-3xl space-y-4 py-8">
      <h1 className="text-4xl font-bold">Cookie notice</h1>
      <p className="text-[var(--nova-text-secondary)]">Essential cookies only for authenticated sessions unless analytics consent is enabled.</p>
    </article>
  );
}

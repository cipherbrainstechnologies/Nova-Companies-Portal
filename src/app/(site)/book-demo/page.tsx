import type { Metadata } from "next";
import { MarketingLink } from "@/components/marketing/blocks";

export const metadata: Metadata = {
  title: "Book a demo | NOVA",
};

export default function BookDemoPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-4 py-8">
      <h1 className="text-4xl font-bold">Book a demo</h1>
      <p className="text-[var(--nova-text-secondary)]">
        Share your expected headcount, timing, and billing currency. We will respond with onboarding steps and a
        transparent cost illustration.
      </p>
      <MarketingLink href="/contact">Contact NOVA</MarketingLink>
    </article>
  );
}

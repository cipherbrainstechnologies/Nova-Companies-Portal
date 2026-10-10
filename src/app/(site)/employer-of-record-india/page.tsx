import type { Metadata } from "next";
import Link from "next/link";
import { MarketingLink } from "@/components/marketing/blocks";

export const metadata: Metadata = {
  title: "Employer of record India | NOVA",
  description:
    "Hire employees in India without a local entity. Transparent payroll, statutory costs, and EOR fees in one client portal.",
};

export default function EmployerOfRecordIndiaPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-6 py-8">
      <h1 className="text-4xl font-bold text-[var(--nova-ink)]">Employer of record in India</h1>
      <p className="text-lg text-[var(--nova-text-secondary)]">
        NOVA&apos;s legal employer signs employment contracts and runs compliant Indian payroll. Your managers direct
        day-to-day work while you see each employee&apos;s gross, statutory, benefits, service fee, and FX charges in a
        secure portal.
      </p>
      <MarketingLink href="/contact">Book a consultation</MarketingLink>
      <p className="text-sm text-[var(--nova-muted)]">
        Already onboarded? <Link href="/login/client" className="text-[var(--nova-teal)]">Client sign-in</Link>
      </p>
    </article>
  );
}

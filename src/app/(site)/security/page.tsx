import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Security | NOVA",
};

export default function SecurityPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-4 py-8">
      <h1 className="text-4xl font-bold">Security</h1>
      <p className="text-[var(--nova-text-secondary)]">
        Tenant isolation for client organizations, private document storage, audited downloads, and deny-by-default
        access controls. Production secrets are managed via platform environment configuration — never committed to git.
      </p>
    </article>
  );
}

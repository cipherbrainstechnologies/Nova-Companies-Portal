"use client";

import { useSearchParams } from "next/navigation";

export function PricingPrefill({ note }: { note: string }) {
  const params = useSearchParams();
  const salary = params.get("salary");
  const headcount = params.get("headcount");
  const currency = params.get("currency");

  if (!salary && !headcount && !currency) return null;

  return (
    <div
      className="mt-8 rounded-[var(--mkt-radius)] border border-[var(--nova-info)] bg-[var(--nova-info-soft)] px-4 py-3 text-sm text-[var(--nova-text-secondary)]"
      role="status"
    >
      <p>{note}</p>
      <ul className="mt-2 tabular-nums font-medium text-[var(--nova-ink)]">
        {salary ? <li>Salary (INR / month): {Number(salary).toLocaleString("en-IN")}</li> : null}
        {headcount ? <li>Headcount: {headcount}</li> : null}
        {currency ? <li>Billing currency: {currency}</li> : null}
      </ul>
    </div>
  );
}

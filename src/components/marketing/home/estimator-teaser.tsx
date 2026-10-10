"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { SiteCopy } from "@/content/public-site";
import { Label } from "@/components/ui";

const CURRENCIES = ["INR", "GBP", "USD", "EUR"] as const;

export function EstimatorTeaser({ copy }: { copy: SiteCopy["home"]["estimator"] }) {
  const [salary, setSalary] = useState("85000");
  const [headcount, setHeadcount] = useState("3");
  const [currency, setCurrency] = useState<string>("GBP");

  const href = useMemo(() => {
    const params = new URLSearchParams();
    if (salary) params.set("salary", salary.replace(/\D/g, ""));
    if (headcount) params.set("headcount", headcount.replace(/\D/g, ""));
    if (currency) params.set("currency", currency);
    const q = params.toString();
    return q ? `/pricing?${q}` : "/pricing";
  }, [salary, headcount, currency]);

  return (
    <section className="mt-16 rounded-[var(--mkt-radius-lg)] border border-[var(--mkt-border)] bg-[var(--mkt-surface)] p-6 md:p-8" aria-labelledby="estimator-heading">
      <h2 id="estimator-heading" className="h-display text-[clamp(1.4rem,3vw,2rem)]">
        {copy.title}
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-[var(--nova-text-secondary)]">{copy.lede}</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="est-salary">{copy.salary}</Label>
          <input
            id="est-salary"
            name="salary"
            type="text"
            inputMode="numeric"
            className="mt-1 w-full rounded-[var(--nova-radius-sm)] border border-[var(--nova-border-strong)] bg-white px-3 py-2.5 text-sm"
            value={salary}
            onChange={(e) => setSalary(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="est-headcount">{copy.headcount}</Label>
          <input
            id="est-headcount"
            name="headcount"
            type="text"
            inputMode="numeric"
            className="mt-1 w-full rounded-[var(--nova-radius-sm)] border border-[var(--nova-border-strong)] bg-white px-3 py-2.5 text-sm"
            value={headcount}
            onChange={(e) => setHeadcount(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="est-currency">{copy.currency}</Label>
          <select
            id="est-currency"
            name="currency"
            className="mt-1 w-full rounded-[var(--nova-radius-sm)] border border-[var(--nova-border-strong)] bg-white px-3 py-2.5 text-sm"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-6">
        <Link
          href={href}
          className="inline-flex min-h-12 items-center justify-center rounded-[var(--nova-radius-sm)] bg-[var(--nova-teal)] px-5 text-[0.95rem] font-semibold text-white hover:bg-[#0d5f58]"
        >
          {copy.submit}
        </Link>
      </div>
    </section>
  );
}

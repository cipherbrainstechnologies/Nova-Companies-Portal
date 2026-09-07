"use client";

import Link from "next/link";
import { landingFixture as f } from "../data/fixtures";

/** B — Layout model: split marketing + portal rail (bento / two-pane). */
export function VariantB() {
  return (
    <div className="grid min-h-[420px] lg:grid-cols-[1.2fr_0.8fr]">
      <div className="flex flex-col justify-between border-b border-stone-200 p-6 md:p-8 lg:border-b-0 lg:border-r">
        <div>
          <div className="text-sm font-semibold text-stone-900">{f.brand}</div>
          <h1 className="mt-6 max-w-lg text-2xl font-semibold leading-snug tracking-tight text-stone-900 md:text-3xl">
            {f.title}
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-stone-600">{f.body}</p>
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {f.folders.map((item) => (
            <div key={item.label} className="rounded-xl bg-white/80 p-3 ring-1 ring-stone-200">
              <div className="text-xs font-semibold text-stone-900">{item.label}</div>
              <p className="mt-1 text-[11px] leading-relaxed text-stone-500">{item.body}</p>
            </div>
          ))}
        </div>
      </div>

      <aside className="flex flex-col justify-center gap-4 bg-white p-6 md:p-8">
        <div>
          <h2 className="text-lg font-semibold text-stone-900">Choose a portal</h2>
          <p className="mt-1 text-sm text-stone-500">Separated gates keep ops and employees on the right path.</p>
        </div>
        <Link
          href="/login/admin"
          className="group rounded-2xl p-4 ring-1 ring-stone-200 transition hover:ring-stone-400"
        >
          <div className="text-xs font-medium uppercase tracking-wide text-stone-400">Admin</div>
          <div className="mt-1 text-base font-semibold text-stone-900 group-hover:text-[#635bff]">
            {f.ctaAdmin}
          </div>
          <p className="mt-1 text-sm text-stone-500">Payroll, statements, profit, permissions.</p>
        </Link>
        <Link
          href="/login/employee"
          className="group rounded-2xl bg-stone-900 p-4 text-white transition hover:bg-stone-800"
        >
          <div className="text-xs font-medium uppercase tracking-wide text-stone-400">Employee</div>
          <div className="mt-1 text-base font-semibold">{f.ctaEmployee}</div>
          <p className="mt-1 text-sm text-stone-300">Open your payslip folder tree.</p>
        </Link>
        <Link href="/verify-document" className="text-center text-sm text-stone-500 underline-offset-4 hover:underline">
          {f.verify}
        </Link>
      </aside>
    </div>
  );
}

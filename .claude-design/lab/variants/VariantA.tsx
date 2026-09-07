"use client";

import Link from "next/link";
import { landingFixture as f } from "../data/fixtures";

/** A — Information hierarchy: one clear story, one primary CTA, quiet secondary. */
export function VariantA() {
  return (
    <div className="px-6 py-8 md:px-10 md:py-12">
      <div className="mb-10 flex items-center justify-between gap-4">
        <div className="text-base font-semibold tracking-tight text-stone-900">{f.brand}</div>
        <div className="flex items-center gap-4 text-sm text-stone-600">
          <Link href="/verify-document" className="min-h-11 inline-flex items-center hover:text-stone-900">
            {f.verify}
          </Link>
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center rounded-full bg-stone-900 px-4 text-sm font-medium text-white hover:bg-stone-800"
          >
            {f.login}
          </Link>
        </div>
      </div>

      <p className="mb-3 text-sm font-medium text-rose-800/80">{f.frame}</p>
      <h1 className="max-w-2xl text-3xl font-semibold leading-tight tracking-tight text-stone-900 md:text-4xl">
        {f.title}
      </h1>
      <p className="mt-4 max-w-xl text-base leading-relaxed text-stone-600">{f.body}</p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link
          href="/login/employee"
          className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#635bff] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#5850ec] active:scale-[0.98]"
        >
          {f.ctaEmployee}
        </Link>
        <Link
          href="/login/admin"
          className="inline-flex min-h-12 items-center justify-center rounded-full px-5 text-sm font-medium text-stone-700 ring-1 ring-stone-300 hover:bg-white"
        >
          {f.ctaAdmin}
        </Link>
      </div>

      <ul className="mt-12 grid gap-6 border-t border-stone-200 pt-8 sm:grid-cols-3">
        {f.points.map((p) => (
          <li key={p.id}>
            <div className="text-xs font-semibold uppercase tracking-wider text-stone-400">{p.id}</div>
            <div className="mt-2 text-sm font-semibold text-stone-900">{p.title}</div>
            <p className="mt-1 text-sm leading-relaxed text-stone-600">{p.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

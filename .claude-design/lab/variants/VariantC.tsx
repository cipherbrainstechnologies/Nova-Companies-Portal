"use client";

import Link from "next/link";
import { landingFixture as f } from "../data/fixtures";

/** C — Density: spacious premium — fewer blocks, more breathing room. */
export function VariantC() {
  return (
    <div className="px-8 py-14 md:px-14 md:py-20">
      <nav className="mb-16 flex items-center justify-between">
        <span className="text-lg font-semibold tracking-tight text-stone-900">{f.brand}</span>
        <Link href="/verify-document" className="text-sm text-stone-500 hover:text-stone-800">
          {f.verify}
        </Link>
      </nav>

      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-medium text-stone-500">{f.frame}</p>
        <h1 className="mt-6 text-3xl font-semibold leading-[1.15] tracking-tight text-stone-900 md:text-5xl">
          Salary documents you can trust.
        </h1>
        <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-stone-600">
          {f.body}
        </p>
        <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Link
            href="/login"
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-stone-900 px-8 text-sm font-semibold text-white hover:bg-stone-800"
          >
            {f.login}
          </Link>
          <Link
            href="/login/employee"
            className="inline-flex min-h-12 items-center justify-center rounded-full px-6 text-sm font-medium text-stone-700"
          >
            {f.ctaEmployee} →
          </Link>
        </div>
      </div>

      <div className="mx-auto mt-20 grid max-w-3xl gap-10 text-left sm:grid-cols-3">
        {f.points.map((p) => (
          <div key={p.id}>
            <div className="h-px w-8 bg-rose-300" />
            <h3 className="mt-4 text-sm font-semibold text-stone-900">{p.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-stone-500">{p.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

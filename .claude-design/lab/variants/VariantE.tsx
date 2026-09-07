"use client";

import Link from "next/link";
import { landingFixture as f } from "../data/fixtures";

/** E — Expressive premium: warm paper stage, soft depth, brand-forward mark. */
export function VariantE() {
  return (
    <div className="relative overflow-hidden px-6 py-10 md:px-10 md:py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[#d4a5a5]/35 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 left-10 h-72 w-72 rounded-full bg-[#b87d6d]/20 blur-3xl"
      />

      <div className="relative">
        <div className="mb-12 flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5d2e46]/70">
              Nova
            </div>
            <div className="mt-1 text-xl font-semibold tracking-tight text-[#3f1d2f]">
              {f.brand}
            </div>
          </div>
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center rounded-full bg-[#5d2e46] px-4 text-sm font-medium text-[#fffaf6] shadow-md shadow-[#5d2e46]/20 transition hover:bg-[#3f1d2f] active:scale-[0.98]"
          >
            {f.login}
          </Link>
        </div>

        <h1 className="max-w-xl text-3xl font-semibold leading-tight tracking-tight text-[#3f1d2f] md:text-4xl">
          {f.title}
        </h1>
        <p className="mt-5 max-w-lg text-base leading-relaxed text-[#5d2e46]/80">{f.body}</p>

        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/login/admin"
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-2xl bg-[#b87d6d] px-5 text-sm font-semibold text-white shadow-lg shadow-[#b87d6d]/25 transition hover:bg-[#a56e5f]"
          >
            {f.ctaAdmin}
          </Link>
          <Link
            href="/login/employee"
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-2xl bg-white/80 px-5 text-sm font-semibold text-[#5d2e46] ring-1 ring-[#5d2e46]/20 backdrop-blur transition hover:bg-white"
          >
            {f.ctaEmployee}
          </Link>
        </div>

        <div className="mt-12 grid gap-3 sm:grid-cols-3">
          {f.folders.map((item, i) => (
            <article
              key={item.label}
              className="rounded-2xl bg-white/70 p-4 shadow-sm ring-1 ring-[#5d2e46]/10 backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
              style={{ transitionDelay: `${i * 40}ms` }}
            >
              <div className="text-sm font-semibold text-[#3f1d2f]">{item.label}</div>
              <p className="mt-2 text-xs leading-relaxed text-[#5d2e46]/75">{item.body}</p>
            </article>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link href="/verify-document" className="text-sm text-[#5d2e46]/70 underline-offset-4 hover:underline">
            {f.verify}
          </Link>
        </div>
      </div>
    </div>
  );
}

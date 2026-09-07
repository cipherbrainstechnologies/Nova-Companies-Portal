"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { landingFixture as f } from "../data/fixtures";

type Portal = "employee" | "admin" | null;

/**
 * F — Synthesis: Variant C spacious premium calm + Variant D progressive portal gate.
 */
export function VariantF() {
  const [portal, setPortal] = useState<Portal>(null);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "ready">("idle");

  function select(next: Portal) {
    setPortal(next);
    setStatus("idle");
    startTransition(() => {
      setTimeout(() => setStatus("ready"), 280);
    });
  }

  return (
    <div className="px-8 py-14 md:px-14 md:py-16">
      <nav className="mb-14 flex items-center justify-between">
        <span className="text-lg font-semibold tracking-tight text-stone-900">{f.brand}</span>
        <Link href="/verify-document" className="min-h-11 inline-flex items-center text-sm text-stone-500 hover:text-stone-800">
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
      </div>

      <div className="mx-auto mt-12 max-w-xl rounded-2xl bg-white p-5 text-left shadow-sm ring-1 ring-stone-200 md:p-6">
        <p className="text-center text-xs font-semibold uppercase tracking-wider text-stone-400">
          Choose your portal
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {(
            [
              ["employee", f.ctaEmployee, "Employee ID or mobile"],
              ["admin", f.ctaAdmin, "Ops email or mobile"],
            ] as const
          ).map(([id, label, hint]) => {
            const active = portal === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => select(id)}
                className={`min-h-14 rounded-xl px-4 py-3 text-left transition duration-200 ${
                  active
                    ? "bg-stone-900 text-white ring-2 ring-stone-900"
                    : "bg-stone-50 text-stone-800 ring-1 ring-stone-200 hover:ring-stone-400"
                }`}
              >
                <div className="text-sm font-semibold">{label}</div>
                <div className={`mt-0.5 text-xs ${active ? "text-stone-300" : "text-stone-500"}`}>
                  {hint}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex flex-col items-stretch gap-3 border-t border-stone-100 pt-5 sm:flex-row sm:items-center">
          <p className="flex-1 text-center text-sm text-stone-500 sm:text-left">
            {!portal && "Select a portal to continue."}
            {portal && pending && "Preparing your gate…"}
            {portal && !pending && status === "ready" && (
              <>
                Ready — continue to{" "}
                <span className="font-medium text-stone-800">
                  {portal === "employee" ? "employee login" : "admin login"}
                </span>
                .
              </>
            )}
          </p>
          <Link
            href={portal === "admin" ? "/login/admin" : portal === "employee" ? "/login/employee" : "#"}
            aria-disabled={!portal || status !== "ready"}
            className={`inline-flex min-h-12 items-center justify-center rounded-full px-6 text-sm font-semibold transition ${
              portal && status === "ready"
                ? "bg-stone-900 text-white hover:bg-stone-800"
                : "pointer-events-none bg-stone-200 text-stone-400"
            }`}
            onClick={(e) => {
              if (!portal || status !== "ready") e.preventDefault();
            }}
          >
            {pending ? "Working…" : "Continue"}
          </Link>
        </div>
      </div>

      <div className="mx-auto mt-16 grid max-w-3xl gap-10 text-left sm:grid-cols-3">
        {f.points.map((p) => (
          <div key={p.id}>
            <div className="mx-auto h-px w-8 bg-rose-300 sm:mx-0" />
            <h3 className="mt-4 text-center text-sm font-semibold text-stone-900 sm:text-left">
              {p.title}
            </h3>
            <p className="mt-2 text-center text-sm leading-relaxed text-stone-500 sm:text-left">
              {p.body}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

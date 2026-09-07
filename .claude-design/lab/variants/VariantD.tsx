"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { landingFixture as f } from "../data/fixtures";

type Portal = "employee" | "admin" | null;

/** D — Interaction model: progressive portal picker + optimistic continue state. */
export function VariantD() {
  const [portal, setPortal] = useState<Portal>(null);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "ready">("idle");

  function select(next: Portal) {
    setPortal(next);
    setStatus("idle");
    startTransition(() => {
      // Optimistic “prepared” feedback without navigating yet
      setTimeout(() => setStatus("ready"), 280);
    });
  }

  return (
    <div className="px-6 py-8 md:px-10">
      <div className="mb-8 flex items-center justify-between">
        <span className="text-base font-semibold text-stone-900">{f.brand}</span>
        <Link href="/verify-document" className="text-sm text-stone-500 hover:text-stone-800">
          {f.verify}
        </Link>
      </div>

      <h1 className="max-w-xl text-2xl font-semibold tracking-tight text-stone-900 md:text-3xl">
        {f.title}
      </h1>
      <p className="mt-3 max-w-lg text-sm leading-relaxed text-stone-600">{f.body}</p>

      <div className="mt-8 rounded-2xl bg-white p-4 ring-1 ring-stone-200 md:p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">
          Step 1 — Who are you?
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {(
            [
              ["employee", f.ctaEmployee, "Use employee ID or mobile"],
              ["admin", f.ctaAdmin, "Ops / Super Admin email or mobile"],
            ] as const
          ).map(([id, label, hint]) => {
            const active = portal === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => select(id)}
                className={`min-h-14 rounded-xl px-4 py-3 text-left transition ${
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

        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-stone-100 pt-4">
          <p className="flex-1 text-sm text-stone-500">
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
            className={`inline-flex min-h-11 items-center rounded-full px-5 text-sm font-semibold transition ${
              portal && status === "ready"
                ? "bg-[#635bff] text-white hover:bg-[#5850ec]"
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
    </div>
  );
}

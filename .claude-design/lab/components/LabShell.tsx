import type { ReactNode } from "react";

export function LabShell({
  letter,
  title,
  why,
  notes,
  children,
}: {
  letter: string;
  title: string;
  why: string;
  notes: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
      <header className="border-b border-stone-100 bg-stone-50 px-4 py-3">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-semibold tracking-widest text-rose-700">
            VARIANT {letter}
          </span>
          <h2 className="text-sm font-semibold text-stone-900">{title}</h2>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-stone-600">{why}</p>
        <p className="mt-1 text-[11px] leading-relaxed text-stone-500">
          <span className="font-medium text-stone-700">Notes:</span> {notes}
        </p>
      </header>
      <div className="min-h-[420px] bg-[#faf9f7]">{children}</div>
    </section>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function MobileQuoteBar({ label }: { label: string }) {
  const path = usePathname();
  if (path !== "/") return null;

  return (
    <>
      <div className="h-[4.75rem] md:hidden" aria-hidden />
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--nova-border)] bg-white/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgb(12_12_50_/_0.08)] backdrop-blur-md md:hidden">
        <Link
          href="/contact"
          className="mkt-btn-on-dark flex min-h-12 w-full items-center justify-center rounded-[var(--mkt-radius-pill)] bg-[var(--nova-purple)] text-base font-semibold text-white hover:bg-[var(--nova-purple-hover)]"
        >
          {label}
        </Link>
      </div>
    </>
  );
}

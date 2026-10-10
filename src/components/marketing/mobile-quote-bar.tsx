"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function MobileQuoteBar({ label }: { label: string }) {
  const path = usePathname();
  if (path !== "/") return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--nova-border)] bg-[color-mix(in_srgb,var(--mkt-surface)_96%,white)] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgb(15_23_42_/_0.08)] md:hidden"
      aria-hidden={false}
    >
      <Link
        href="/pricing"
        className="flex min-h-12 w-full items-center justify-center rounded-[var(--nova-radius-sm)] bg-[var(--nova-teal)] text-sm font-semibold text-white hover:bg-[#0d5f58]"
      >
        {label}
      </Link>
    </div>
  );
}

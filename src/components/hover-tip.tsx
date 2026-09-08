"use client";

import { cn } from "@/lib/utils";

/** Accessible hover/focus tip — visible on light surfaces (native title is often unreadable). */
export function HoverTip({
  label,
  children,
  className,
  side = "top",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  side?: "top" | "bottom";
}) {
  return (
    <span className={cn("group relative inline-flex", className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute left-1/2 z-40 w-max max-w-[16rem] -translate-x-1/2 rounded-[var(--nova-radius-sm)] border border-[var(--nova-border-strong)] bg-[var(--nova-ink)] px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-[var(--nova-shadow-md)] transition-opacity group-hover:opacity-100 group-focus-within:opacity-100",
          side === "top" ? "bottom-[calc(100%+0.4rem)]" : "top-[calc(100%+0.4rem)]",
        )}
      >
        {label}
      </span>
    </span>
  );
}

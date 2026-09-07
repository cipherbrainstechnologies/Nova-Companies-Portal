"use client";

import { cn } from "@/lib/utils";

export function PayslipPreview({
  html,
  className,
  label,
}: {
  html: string;
  className?: string;
  label?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {label ? (
        <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--nova-muted)]">
          {label}
        </p>
      ) : null}
      <iframe
        title="Payslip preview"
        sandbox=""
        srcDoc={html || "<p style='font-family:sans-serif;padding:1rem;color:#666'>No preview yet.</p>"}
        className="h-[32rem] w-full rounded-[var(--nova-radius)] border border-[var(--nova-border)] bg-white"
      />
    </div>
  );
}

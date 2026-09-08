"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  className,
  wide,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nova-modal-title"
      onClick={onClose}
    >
      <div
        className={cn(
          "max-h-[92vh] w-full overflow-y-auto rounded-t-[var(--nova-radius-lg)] border border-[var(--nova-border)] bg-[var(--nova-surface)] p-5 shadow-[var(--nova-shadow-md)] sm:rounded-[var(--nova-radius-lg)]",
          wide ? "sm:max-w-3xl" : "sm:max-w-lg",
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="nova-modal-title" className="text-base font-semibold text-[var(--nova-ink)]">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm text-[var(--nova-muted)]">{description}</p>
            ) : null}
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            Close
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}

import * as React from "react";
import { cn } from "@/lib/utils";

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "ghost" | "danger" | "outline" | "secondary";
    size?: "sm" | "md" | "lg";
  }
>(function Button({ className, variant = "primary", size = "md", ...props }, ref) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[var(--nova-radius-sm)] font-semibold transition-colors disabled:pointer-events-none disabled:opacity-45",
        size === "sm" && "min-h-9 px-3 text-sm",
        size === "md" && "min-h-11 px-4 text-sm",
        size === "lg" && "min-h-12 px-5 text-[0.95rem]",
        variant === "primary" &&
          "bg-[var(--nova-teal)] text-white hover:bg-[#0d5f58] shadow-sm",
        variant === "secondary" &&
          "bg-[var(--nova-ink)] text-white hover:bg-[#16384d]",
        variant === "outline" &&
          "border border-[var(--nova-border-strong)] bg-[var(--nova-surface)] text-[var(--nova-text)] hover:border-[var(--nova-teal)] hover:text-[var(--nova-teal)]",
        variant === "ghost" &&
          "bg-transparent text-[var(--nova-text-secondary)] hover:bg-[var(--nova-surface-muted)] hover:text-[var(--nova-text)]",
        variant === "danger" &&
          "bg-[var(--nova-danger)] text-white hover:bg-[#991b1b]",
        className,
      )}
      {...props}
    />
  );
});

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-[var(--nova-radius-sm)] border border-[var(--nova-border-strong)] bg-[var(--nova-surface)] px-3 py-2.5 text-sm text-[var(--nova-text)] placeholder:text-[var(--nova-muted)] focus-visible:border-[var(--nova-teal)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--nova-teal)]/30",
        className,
      )}
      {...props}
    />
  );
});

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "mb-1.5 block text-xs font-semibold tracking-wide text-[var(--nova-text-secondary)]",
        className,
      )}
      {...props}
    />
  );
}

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[var(--nova-radius)] border border-[var(--nova-border)] bg-[var(--nova-surface)] p-5 shadow-[var(--nova-shadow)]",
        className,
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full rounded-[var(--nova-radius-sm)] border border-[var(--nova-border-strong)] bg-[var(--nova-surface)] px-3 py-2.5 text-sm text-[var(--nova-text)] focus-visible:border-[var(--nova-teal)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--nova-teal)]/30",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

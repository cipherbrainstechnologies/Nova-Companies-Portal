import * as React from "react";
import { cn } from "@/lib/utils";

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "ghost" | "danger" | "outline";
  }
>(function Button({ className, variant = "primary", ...props }, ref) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center border-2 border-[var(--ink)] px-4 py-2 text-[0.7rem] font-normal tracking-[0.1em] uppercase disabled:opacity-40",
        variant === "primary" &&
          "bg-[var(--ink)] text-[var(--bg)] hover:bg-[var(--accent)] hover:border-[var(--accent)]",
        variant === "outline" &&
          "bg-[var(--bg)] text-[var(--ink)] hover:border-[var(--accent)] hover:text-[var(--accent)]",
        variant === "ghost" &&
          "border-transparent bg-transparent text-[var(--ink)] hover:text-[var(--accent)]",
        variant === "danger" &&
          "border-[var(--accent)] bg-[var(--accent)] text-white hover:bg-[var(--ink)] hover:border-[var(--ink)]",
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
        "w-full border-2 border-[var(--ink)] bg-[var(--bg)] px-3 py-2 text-[0.75rem] tracking-[0.08em] text-[var(--ink)] uppercase placeholder:text-[var(--muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-0",
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
        "mb-1 block text-[0.65rem] font-normal tracking-[0.12em] text-[var(--muted)] uppercase",
        className,
      )}
      {...props}
    />
  );
}

/** Industrial compartment — replaces soft cards. Zero radius, hard border. */
export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("border-2 border-[var(--ink)] bg-[var(--bg)] p-4", className)}
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
        "w-full border-2 border-[var(--ink)] bg-[var(--bg)] px-3 py-2 text-[0.75rem] tracking-[0.08em] uppercase focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

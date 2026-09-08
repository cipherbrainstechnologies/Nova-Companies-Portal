"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Input, Label } from "@/components/ui";
import { MoneyValue } from "@/components/industrial";
import { cn } from "@/lib/utils";

export type PaymentComboboxOption = {
  id: string;
  displayDate: string;
  particulars: string;
  beneficiary: string;
  debit: number | null;
  utrReference: string | null;
  matchExplanation: string;
  allocationStatus: string;
  recommended?: boolean;
  preferred?: boolean;
  excludedReason?: string;
};

type SearchResponse = {
  results: PaymentComboboxOption[];
  total: number;
  hasMore: boolean;
  error?: string;
};

function formatMoneyLabel(value: number | null) {
  if (value == null) return "—";
  return `₹${value.toLocaleString("en-IN")}`;
}

export function PaymentSearchCombobox({
  companyId,
  year,
  month,
  employeeId,
  value,
  onChange,
  disabled,
  daysBefore,
  daysAfter,
  initialOptions = [],
}: {
  companyId: string;
  year: number;
  month: number;
  employeeId?: string;
  value: string;
  onChange: (transactionId: string, option: PaymentComboboxOption | null) => void;
  disabled?: boolean;
  daysBefore?: number;
  daysAfter?: number;
  initialOptions?: PaymentComboboxOption[];
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<PaymentComboboxOption[]>(initialOptions);
  const [total, setTotal] = useState(initialOptions.length);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [narrationId, setNarrationId] = useState<string | null>(null);

  const selected = useMemo(
    () => results.find((row) => row.id === value) ?? initialOptions.find((row) => row.id === value),
    [results, initialOptions, value],
  );

  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(query.trim()), 250);
    return () => window.clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function load(nextOffset: number, append: boolean) {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          companyId,
          year: String(year),
          month: String(month),
          limit: "40",
          offset: String(nextOffset),
        });
        if (debounced) params.set("q", debounced);
        if (employeeId) params.set("employeeId", employeeId);
        if (daysBefore != null) params.set("daysBefore", String(daysBefore));
        if (daysAfter != null) params.set("daysAfter", String(daysAfter));
        const res = await fetch(`/api/payroll/payments/search?${params.toString()}`);
        const body = (await res.json()) as SearchResponse;
        if (!res.ok) throw new Error(body.error ?? "Payment search failed");
        if (cancelled) return;
        setResults((prev) => (append ? [...prev, ...body.results] : body.results));
        setTotal(body.total);
        setHasMore(body.hasMore);
        setOffset(nextOffset);
        setActiveIndex(0);
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Payment search failed");
          if (!append) setResults([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load(0, false);
    return () => {
      cancelled = true;
    };
  }, [open, debounced, companyId, year, month, employeeId, daysBefore, daysAfter]);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  async function loadMore() {
    if (!hasMore || loading) return;
    setLoading(true);
    try {
      const nextOffset = offset + 40;
      const params = new URLSearchParams({
        companyId,
        year: String(year),
        month: String(month),
        limit: "40",
        offset: String(nextOffset),
      });
      if (debounced) params.set("q", debounced);
      if (employeeId) params.set("employeeId", employeeId);
      if (daysBefore != null) params.set("daysBefore", String(daysBefore));
      if (daysAfter != null) params.set("daysAfter", String(daysAfter));
      const res = await fetch(`/api/payroll/payments/search?${params.toString()}`);
      const body = (await res.json()) as SearchResponse;
      if (!res.ok) throw new Error(body.error ?? "Payment search failed");
      setResults((prev) => [...prev, ...body.results]);
      setTotal(body.total);
      setHasMore(body.hasMore);
      setOffset(nextOffset);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Payment search failed");
    } finally {
      setLoading(false);
    }
  }

  function pick(option: PaymentComboboxOption) {
    onChange(option.id, option);
    setQuery("");
    setOpen(false);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (event.key === "ArrowDown" || event.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (!open) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => Math.min(results.length - 1, i + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = results[activeIndex];
      if (option) pick(option);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <Label htmlFor={`${listId}-input`}>Bank payment to allocate</Label>
      <Input
        id={`${listId}-input`}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        disabled={disabled}
        placeholder="Search name, amount, reference or narration"
        value={open ? query : selected ? `${selected.displayDate} · ${formatMoneyLabel(selected.debit)} · ${selected.beneficiary || selected.particulars}` : query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {selected && !open ? (
        <p className="mt-1 text-xs text-[var(--nova-muted)]">
          {selected.matchExplanation}
          {" · "}
          <button
            type="button"
            className="underline"
            onClick={() => setNarrationId(selected.id)}
          >
            View full narration
          </button>
        </p>
      ) : null}

      {open ? (
        <div
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-80 w-full overflow-auto rounded-[var(--nova-radius-sm)] border border-[var(--nova-border-strong)] bg-[var(--nova-surface)] shadow-lg"
        >
          {loading && !results.length ? (
            <p className="px-3 py-3 text-sm text-[var(--nova-muted)]">Searching payments…</p>
          ) : null}
          {error ? <p className="px-3 py-3 text-sm text-[var(--nova-danger)]">{error}</p> : null}
          {!loading && !error && !results.length ? (
            <p className="px-3 py-3 text-sm text-[var(--nova-muted)]">No payments match this search.</p>
          ) : null}
          {results.map((option, index) => (
            <div
              key={option.id}
              role="option"
              aria-selected={value === option.id}
              className={cn(
                "cursor-pointer border-b border-[var(--nova-border)] px-3 py-2.5 text-sm last:border-b-0",
                index === activeIndex ? "bg-[var(--nova-surface-muted)]" : "",
                option.recommended ? "border-l-2 border-l-[var(--nova-teal)]" : "",
              )}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(option)}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-semibold text-[var(--nova-ink)]">
                  {option.beneficiary || "Unknown beneficiary"}
                </span>
                <span className="font-semibold">
                  {option.debit != null ? <MoneyValue value={option.debit} /> : "—"}
                </span>
              </div>
              <div className="mt-0.5 text-xs text-[var(--nova-text-secondary)]">
                {option.displayDate}
                {option.utrReference ? ` · Ref ${option.utrReference}` : ""}
                {option.recommended ? " · Recommended" : ""}
              </div>
              <div className="mt-0.5 text-xs text-[var(--nova-muted)]">{option.matchExplanation}</div>
              <div className="mt-0.5 text-xs text-[var(--nova-muted)]">
                {option.allocationStatus}
                {" · "}
                <button
                  type="button"
                  className="underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setNarrationId(option.id);
                  }}
                >
                  View full narration
                </button>
              </div>
            </div>
          ))}
          {hasMore ? (
            <button
              type="button"
              className="w-full px-3 py-2 text-left text-sm font-semibold text-[var(--nova-teal)]"
              onClick={() => void loadMore()}
              disabled={loading}
            >
              {loading ? "Loading…" : `Load more (${results.length} of ${total})`}
            </button>
          ) : null}
        </div>
      ) : null}

      {narrationId ? (
        <div className="mt-2 rounded-[var(--nova-radius-sm)] bg-[var(--nova-surface-muted)] p-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold">Full narration</span>
            <button type="button" className="text-xs underline" onClick={() => setNarrationId(null)}>
              Close
            </button>
          </div>
          <p className="mt-1 whitespace-pre-wrap break-words text-[var(--nova-text-secondary)]">
            {(results.find((r) => r.id === narrationId) ?? selected)?.particulars ?? "—"}
          </p>
        </div>
      ) : null}
    </div>
  );
}

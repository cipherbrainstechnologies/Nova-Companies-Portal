"use client";

import { useState } from "react";
import type { SiteCopy } from "@/content/public-site";

export function PortalTourTabs({ copy }: { copy: SiteCopy["home"]["portal"] }) {
  const [active, setActive] = useState(0);
  const tab = copy.tabs[active];

  return (
    <section className="mt-16" aria-labelledby="portal-heading">
      <h2 id="portal-heading" className="h-display text-[clamp(1.6rem,3vw,2.15rem)]">
        {copy.title}
      </h2>
      <p className="mt-2 max-w-2xl text-[var(--nova-text-secondary)]">{copy.lede}</p>
      <div className="mkt-elevated mt-8 overflow-hidden rounded-[var(--mkt-radius-lg)] border border-[var(--mkt-border)] bg-[var(--mkt-surface)]">
        <div
          role="tablist"
          aria-label={copy.tablistLabel}
          className="flex flex-wrap gap-1 border-b border-[var(--mkt-border)] bg-[var(--nova-surface-muted)] p-2"
        >
          {copy.tabs.map((item, index) => {
            const selected = index === active;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`portal-tab-${item.id}`}
                aria-selected={selected}
                aria-controls={`portal-panel-${item.id}`}
                tabIndex={selected ? 0 : -1}
                className={
                  selected
                    ? "rounded-[var(--nova-radius-sm)] bg-white px-3 py-2 text-sm font-semibold text-[var(--nova-teal)] shadow-sm"
                    : "rounded-[var(--nova-radius-sm)] px-3 py-2 text-sm font-medium text-[var(--nova-text-secondary)] hover:text-[var(--nova-teal)]"
                }
                onClick={() => setActive(index)}
              >
                {item.label}
              </button>
            );
          })}
        </div>
        <div
          role="tabpanel"
          id={`portal-panel-${tab.id}`}
          aria-labelledby={`portal-tab-${tab.id}`}
          className="grid gap-6 p-6 md:grid-cols-2 md:p-8"
        >
          <div className="rounded-[var(--mkt-radius)] border border-dashed border-[var(--mkt-border)] bg-[var(--nova-surface-muted)] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--nova-muted)]">{copy.mockLabel}</p>
            <ul className="mt-4 space-y-2 text-sm text-[var(--nova-text-secondary)]">
              {tab.mockLines.map((line) => (
                <li key={line} className="flex justify-between gap-4 border-b border-[var(--nova-border)] pb-2 last:border-0">
                  <span>{line}</span>
                  <span className="tabular-nums text-[var(--nova-muted)]">···</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-bold text-[var(--nova-ink)]">{tab.label}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--nova-text-secondary)]">{tab.benefit}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

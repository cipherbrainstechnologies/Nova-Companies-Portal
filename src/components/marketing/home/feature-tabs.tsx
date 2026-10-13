"use client";

import { useState } from "react";
import type { SiteCopy } from "@/content/public-site";

type Tab = SiteCopy["home"]["darkFeature"]["tabs"][number];

export function FeatureTabs({ copy }: { copy: SiteCopy["home"]["darkFeature"] }) {
  const [active, setActive] = useState(copy.tabs[0]?.id ?? "employment");

  const tab = copy.tabs.find((t) => t.id === active) ?? copy.tabs[0];

  return (
    <section className="mkt-section bg-[var(--mkt-dark)] text-white">
      <div className="mkt-container">
        <h2 className="mkt-h2 max-w-3xl text-white">{copy.title}</h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/70">{copy.lede}</p>
        <div
          className="mt-10 flex flex-wrap gap-2"
          role="tablist"
          aria-label={copy.tablistLabel}
        >
          {copy.tabs.map((t) => {
            const selected = t.id === active;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={selected}
                aria-controls={`panel-${t.id}`}
                className={`rounded-[var(--mkt-radius-pill)] px-5 py-2.5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                  selected ? "bg-[var(--mkt-accent)] text-white" : "bg-white/10 text-white/90 hover:bg-white/15"
                }`}
                onClick={() => setActive(t.id)}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        <div
          role="tabpanel"
          id={`panel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          className="mt-8 grid gap-8 lg:grid-cols-2 lg:items-center"
        >
          <div>
            <h3 className="text-xl font-bold">{tab.heading}</h3>
            <p className="mt-3 text-sm leading-relaxed text-white/75">{tab.body}</p>
            <ul className="mt-4 space-y-2 text-sm text-white/80">
              {tab.bullets.map((b) => (
                <li key={b} className="flex gap-2">
                  <span className="text-[var(--mkt-accent)]" aria-hidden>✓</span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <TabVisual tab={tab} />
        </div>
      </div>
    </section>
  );
}

function TabVisual({ tab }: { tab: Tab }) {
  return (
    <div className="rounded-[var(--mkt-radius-lg)] border border-white/10 bg-white/5 p-6">
      <p className="text-xs font-medium uppercase tracking-wide text-white/50">{tab.mockLabel}</p>
      <div className="mt-4 space-y-3">
        {tab.mockLines.map((line) => (
          <div key={line} className="rounded-[var(--mkt-radius)] bg-white/10 px-4 py-3 text-sm text-white/90">
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}

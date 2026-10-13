# NOVA marketing design system (website layer)

Derived from the NOVA public UX audit (§4) and the **design** skill (`brand` → `design-system` → `ui-styling` workflow). Admin and employee portals **keep** existing `--nova-*` tokens in `globals.css`; marketing adds a **scoped extension** only.

## Principles

- Premium international B2B SaaS — calm, precise, financial-ops aesthetic.
- No stock handshake photos, cartoon illustrations, or fake dashboard metrics.
- Synthetic portal previews only, with visible **Illustrative data** labels.
- WCAG 2.2 AA: contrast, focus rings, `prefers-reduced-motion`, keyboard operability.

## Brand voice (public)

| Use | Avoid |
|-----|--------|
| Transparent, employee-level costs | “Seamless”, “effortless”, “revolutionary” |
| You direct work; NOVA manages employment | Cheapest in India, guaranteed compliance |
| Indicative estimates, reviewed proposals | Binding quotes without approval |

## Color tokens (marketing extension)

Base continuity from portal:

| Token | Value | Role |
|-------|-------|------|
| `--nova-navy` | `#0C0C32` | Hero, footer, contrast sections |
| `--nova-purple` | `#5857F5` | Primary CTA, links |

Marketing-only additions (apply under `[data-marketing="true"]` or `(site)` layout wrapper):

| Token | Value | Role |
|-------|-------|------|
| `--mkt-canvas` | `#FFFFFF` | Page background |
| `--mkt-surface` | `#FFFFFF` | Cards, panels |
| `--mkt-soft-bg` | `#F5F6FD` | Soft sections |
| `--mkt-border` | `#E5E7EF` | Dividers |
| `--mkt-radius-lg` | `24px` | Cards |
| Hero surface | navy → purple glow | Full-width hero |

Machine-readable copy: `assets/marketing-design-tokens.json`.

## Typography

Font: **Plus Jakarta Sans** (already loaded).

| Element | Desktop | Mobile (clamp) |
|---------|---------|----------------|
| Hero H1 | 64–68px | ~34px |
| Section title | 28–40px | 24–32px |
| Body | 16–18px | 16px min |
| Eyebrow | 12px, semibold, tracking `0.14em`, uppercase teal |

Use `text-balance` / `max-w-*` on headlines; test 320px width.

## Layout

- Content max width: **1280px** (`max-w-7xl` or custom).
- 12-column grid for hero + product preview split.
- One primary message per section; alternate narrative vs proof.
- Sticky header: transparent → solid on scroll (Sprint 2).

## Components (to build in Sprint 1–2)

| Component | Purpose |
|-----------|---------|
| `MarketingHero` | Eyebrow, H1, subhead, dual CTA, client sign-in link |
| `CostDashboardPreview` | Read-only synthetic employee cost breakdown |
| `EstimatorTeaser` | Salary + headcount → link to `/pricing?...` |
| `ResponsibilityCompare` | Client vs NOVA columns |
| `OnboardingTimeline` | Six steps with owner/deliverable/gate |
| `PortalTourTabs` | Employees / Costs / Invoices / Approvals / Documents |
| `TrustEvidence` | Entity facts + process (no fabricated logos) |
| `PricingCalculator` | Server-backed line items (Sprint 3) |

Reuse `Button`, `Input`, `Card` from `@/components/ui` where possible (design skill `ui-styling`).

## Motion

- Subtle scroll reveal: opacity + 8px translate, **disabled** when `prefers-reduced-motion: reduce`.
- No animation-only status; use `aria-live` for calculator updates.

## Imagery

- Prefer HTML/CSS product mockups over raster screenshots until stable.
- Label all numbers as illustrative; link to methodology on `/pricing` and `/fx-transparency`.

## shadcn / Tailwind notes

- Scope marketing utilities in `(site)/layout.tsx` via `data-marketing="true"` on root div.
- Do not change admin shell density or industrial remnants in payroll UI.

## Next steps

1. Design review of `HOMEPAGE_WIREFRAME.md`.
2. Implement token wrapper + hero in Sprint 2 after approval.
3. Optional: run design skill logo/CIP scripts only if brand mark refresh is requested (`GEMINI_API_KEY`).

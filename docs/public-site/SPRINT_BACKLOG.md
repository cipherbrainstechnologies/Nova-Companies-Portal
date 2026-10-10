# Public website sprint backlog

Execution order from NOVA UX audit §10, reconciled with `AS_IS_AUDIT.md` on `main`.

## Sprint 0 — Inventory, baseline, security ✅ (this PR)

| ID | Story | Acceptance |
|----|-------|------------|
| S0-1 | Route + gap audit | `docs/public-site/AS_IS_AUDIT.md` |
| S0-2 | Design direction + tokens spec | `MARKETING_DESIGN_SYSTEM.md`, `assets/marketing-design-tokens.json` |
| S0-3 | Homepage wireframe for sign-off | `HOMEPAGE_WIREFRAME.md` |
| S0-4 | Install design skill | `.agents/skills/design/` |
| S0-5 | Security spot-check | Documented in AS_IS; rotation = operator |

**Exit gate:** Business approval of wireframe, pricing model, legal disclosures before Sprint 1–2 code.

## Sprint 1 — Design system and conversion architecture

| ID | Story | Files (expected) |
|----|-------|------------------|
| S1-1 | Marketing layout wrapper + tokens | `(site)/layout.tsx`, `globals.css` or scoped CSS |
| S1-2 | Header/footer IA | `site-header.tsx`, `site-shell.tsx` |
| S1-3 | Marketing component primitives | `src/components/marketing/*` |
| S1-4 | Quote API contract (design only) | `docs/eor/API_CONTRACTS.md` or `docs/public-site/ESTIMATE_API.md` |

## Sprint 2 — Homepage + EOR landing

| ID | Story |
|----|-------|
| S2-1 | Implement `HOMEPAGE_WIREFRAME.md` sections |
| S2-2 | Expand `/employer-of-record-india` |
| S2-3 | i18n copy refresh (en first) |
| S2-4 | Redirect or canonical strategy for `/how-we-work` |

## Sprint 3 — Pricing engine

| ID | Story |
|----|-------|
| S3-1 | Prisma models: `PricingPlan`, `CostEstimate`, `QuoteRequest`, … |
| S3-2 | `POST /api/public/estimates` (Zod, Decimal, rate limit) |
| S3-3 | Calculator UI on `/pricing` |
| S3-4 | Finance/legal sign-off on formulas and disclaimers |

## Sprint 4 — Onboarding explainer + qualified leads

| ID | Story |
|----|-------|
| S4-1 | Interactive `/how-it-works` |
| S4-2 | Contact form qualification fields |
| S4-3 | Lead lifecycle handoff to `ClientOrganization` |

## Sprint 5 — Platform tour, trust, SEO

| ID | Story |
|----|-------|
| S5-1 | Synthetic portal tour on `/platform` |
| S5-2 | Compliance/security content review |
| S5-3 | Sitemap, schema, canonical audit |

## Ticket template

Each story must include: objective, routes touched, design reference, API contract, permissions (N/A for public), acceptance criteria, test evidence, migration/rollback, owner, status.

## Analytics events (when instrumentation lands)

`hero_quote_click`, `pricing_estimate_completed`, `quote_requested`, `consultation_requested`, `contact_submitted`, plus client lifecycle events from audit §12.

# Nova Workforce — high-fidelity implementation progress

**Branch:** `cursor/nova-website-revamp-eac0`  
**Last updated:** 13 October 2026

## Phases completed

| Phase | Status |
|-------|--------|
| 0 Discovery audit | `docs/nova-website-audit.md` |
| 1 Visual design system | NT tokens under `[data-marketing="true"]`, `.mkt-h1/h2`, pill CTAs |
| 2 Header / nav | Services + Resources dropdowns, Talk to an Expert |
| 3–14 Homepage | Hero, trust strip, problem/solution, steps, services, dark tabs, comparison, cost, compliance, principles (no fake testimonials), final CTA, dark footer |
| 15 Service pages | `/employer-of-record-india`, `/india-payroll-services`, `/hire-employees-in-india`, `/india-employment-compliance`, `/contact` |
| 16 Lead capture | `ContactForm` + `POST /api/contact`, duplicate-submit guard |
| 17 SEO | Metadata, sitemap, OG on homepage, redirect `/services/payroll` → `/india-payroll-services` |
| 18–19 QA | Build, typecheck, unit tests, Playwright smoke |
| 20 Idempotence | Reused content layer; no new dependencies |

## Reusable components

- `site-header.tsx`, `site-footer.tsx`, `blocks.tsx`
- `home/hero-dashboard-visual.tsx`, `home/feature-tabs.tsx`
- `landing-page.tsx`

## Blockers

- Live contact email requires production Resend configuration.
- Reference screenshot file not in repo; fidelity matched to brief + public Native Teams IA.

## Deployment readiness

**GO** for merge pending stakeholder review of copy and legal footer.

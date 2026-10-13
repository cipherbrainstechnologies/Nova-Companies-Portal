# Nova Workforce — high-fidelity rebuild audit (Phase 0)

**Date:** 13 October 2026  
**Branch:** `cursor/nova-website-revamp-eac0`  
**Repository:** Nova-Companies-Portal (`src/app/(site)/` marketing site)

## Source verification

| Check | Result |
|-------|--------|
| Website source present | Yes — Next.js 15 App Router, `(site)` route group |
| Framework migration required | No |
| Reference screenshot `1000278178.jpg` | Not found in workspace uploads; visual target taken from brief + Native Teams public pages (composition only) |

## Stack (retained)

- Next.js 15, React 19, Tailwind 4, TypeScript
- Copy: `src/content/public-site/en.ts` (+ fr/es spreads)
- Lead capture: `POST /api/contact` (Resend → `CONTACT_INBOX`)
- Client portal exists at `/login/client` — hero UI labelled **illustrative**

## Pre-change baseline

| Command | Result |
|---------|--------|
| `npm run build` | Pass (prior revamp) |
| `npm run test` | 155 pass |
| `npm run lint` | Pass (warnings only) |

## Prior marketing state vs target

| Area | Prior | Target |
|------|-------|--------|
| Palette | Navy / purple | Charcoal `#191919` + accent `#FF245C` |
| Hero | Side-by-side diagram | Center-weighted headline, pink keyword, dashboard visual below |
| Header | Flat links | Services dropdown, Resources, Talk to an Expert |
| Footer | Light 3-column | Dark multi-column |
| Homepage density | ~10 sections | Full NT-style funnel (trust, dark feature tabs, comparison, cost, principles) |

## Retain / refactor / replace

| Retain | Refactor | Replace |
|--------|----------|---------|
| `ContactForm` + API | `SiteShell`, `SiteHeader` | Homepage composition |
| `PricingCalculator` on `/pricing` | `blocks.tsx` button styles | Purple token layer → pink NT tokens |
| Portal routes | `en.ts` home copy | Inline footer in shell → `SiteFooter` |

## Blockers

- Production email send requires `RESEND_API_KEY` in deployment (form logic present).
- Verified testimonials / client logos: **not available** — principles section used instead.

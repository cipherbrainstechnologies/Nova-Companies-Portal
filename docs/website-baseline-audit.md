# Nova Workforce — website baseline audit (Phase 0)

**Date:** 13 October 2026  
**Repository:** `cipherbrainstechnologies/Nova-Companies-Portal` (workspace: `novaworkforce` monorepo portal)  
**Branch at audit:** `main` (clean working tree)  
**Execution branch:** `cursor/nova-website-revamp-eac0`

## Summary

The production website frontend **is present** in this repository. It is a **Next.js 15** App Router application with a dedicated marketing route group at `src/app/(site)/`, sharing the same deployment as the payroll/EOR admin and client portals. This is not a stub repository.

## Stack and tooling

| Area | Finding |
|------|---------|
| Framework | Next.js 15.5 (`next dev --turbopack`, `next build`) |
| Runtime | Node ≥ 20 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 + `globals.css` design tokens |
| UI | Radix primitives, shared `@/components/ui` |
| ORM / API | Prisma 6, Route Handlers under `src/app/api/` |
| Package manager | npm (`package-lock.json`) |
| i18n | `src/content/public-site/` (`en`, `fr`, `es`) + `getRequestLocale` |
| E2E | Playwright (`e2e/smoke.spec.ts`, `e2e/client-eor.spec.ts`) |
| Unit tests | Vitest (`tests/`, 155 tests) |
| Deployment | Railway (`.railway/railway.ts`, `Dockerfile`, `docs/RAILWAY_DEPLOYMENT.md`) |

## Baseline verification (pre-change)

| Command | Result |
|---------|--------|
| `npm ci` | Success |
| `npm run lint` | Pass (7 pre-existing warnings, 0 errors) |
| `npm run typecheck` | Pass |
| `npm run test` | Pass (21 files, 155 tests) |
| `npm run build` | Pass |

## Public marketing routes (verified)

| Route | Purpose | Maturity before revamp |
|-------|---------|------------------------|
| `/` | Homepage | Product-led EOR narrative; portal previews; pricing estimator |
| `/employer-of-record-india` | India EOR landing | Partial depth |
| `/how-it-works` | Process | Minimal static list |
| `/how-we-work` | Alternate process copy | IA duplication with `/how-it-works` |
| `/services`, `/about`, `/companies`, `/faq`, `/contact`, `/pricing` | Supporting | Content-driven |
| `/platform`, `/compliance`, `/security`, `/fx-transparency` | Trust / product | Mixed depth |
| `/privacy`, `/terms`, `/cookies` | Legal | Present |
| `/book-demo` | Demo CTA | Present; scheduling vendor not verified |
| `/login/*`, `/client/*`, `/admin/*`, `/employee/*` | Portals | Functional (out of marketing scope) |

**Gaps vs target IA:** No `/india-hiring-guide` or `/services/payroll` routes; header emphasised platform/compliance over EOR-first funnel.

## Marketing architecture

- **Shell:** `SiteShell` + `SiteHeader` + footer (`data-marketing="true"`).
- **Components:** `src/components/marketing/` (`blocks`, `contact-form`, home widgets).
- **Tokens:** Shared `--nova-*` (teal ink palette) with scoped `--mkt-*` under `[data-marketing="true"]`.
- **Copy:** Centralised in `src/content/public-site/en.ts` (primary).

## Lead generation and integrations (preserve)

| Integration | Endpoint / behaviour |
|-------------|----------------------|
| Contact form | `POST /api/contact` — email via Resend to `CONTACT_INBOX` or `thenovaworkforce@gmail.com`; honeypot field `website` |
| EOR quote persistence | Creates `PublicQuoteRequest` when consent + EOR topic (server-side) |
| Public cost estimate | `POST /api/public/estimates`, `GET /api/public/estimates/[reference]` |
| Analytics | No third-party marketing pixels observed in `(site)` layout |

**Blocker note:** Production email delivery requires `RESEND_API_KEY` and inbox configuration in Railway; form cannot be end-to-end verified in CI without secrets.

## SEO and metadata

- Per-page `generateMetadata` on homepage; static metadata on some routes.
- `app/sitemap.ts` and `app/robots.ts` present.
- `APP_URL` drives canonical base in sitemap.

## Reusable assets to retain

- `ContactForm` with validation and API contract.
- `PricingCalculator` and employer cost engine (backend-tested).
- Portal login paths and client shell (unchanged).
- Existing legal routes and entity-boundary copy patterns in `docs/eor/ENTITY_BOUNDARIES.md`.

## Implementation checklist (revamp)

- [x] Phase 0 — Baseline audit (this document)
- [x] Phase 1 — Marketing design tokens (navy / purple palette, scoped)
- [x] Phase 2 — Navigation and IA alignment
- [x] Phase 3 — Homepage sections A–K per specification
- [x] Phase 4 — Supporting pages (`/services/payroll`, `/india-hiring-guide`, refined EOR/process/about)
- [x] Phase 5 — Contact funnel verification (preserve API)
- [x] Phase 6 — SEO metadata, sitemap updates (Open Graph on homepage)
- [x] Phase 7 — Accessibility and performance pass (scoped CSS, reduced motion preserved)
- [x] Phase 8 — Responsive browser QA (390px, 1440px)
- [x] Phase 9 — Tests and build
- [x] Phase 10 — Polish and delivery report

## Risks and unknowns

- Live production URL and analytics IDs not verified in this environment.
- Legal entity strings in footer require business sign-off (`docs/eor/ENTITY_BOUNDARIES.md`).
- Reference Native Teams pages used for IA inspiration only; not copied verbatim.
- `how-we-work` vs `how-it-works` duplication to be resolved via redirects or footer-only links.

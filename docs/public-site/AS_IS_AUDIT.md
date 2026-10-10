# NOVA public website — as-is audit (Sprint 0)

**Version:** 1.0  
**Date:** 10 October 2026  
**Branch audited:** `main` (reconciled with NOVA Public Website UX audit v1.0)  
**Design skill:** `ui-ux-pro-max` design skill installed at `.agents/skills/design/` (MIT)

## Evidence method

- Full route inventory under `src/app/(site)/`, marketing components, public copy, contact API, client portal surfaces, Prisma models related to EOR.
- Cross-check against uploaded sprint plan (`NOVA_Public_Website_UX_Conversion_Audit_and_Cursor_Sprint_Plan_2469.md`).
- **Not verified in this pass:** live production deployment, Core Web Vitals field data, search rankings, analytics funnels, counsel-approved legal copy, approved commercial fee tables.

## Product positioning (target state)

| Item | Target (approved narrative) |
|------|-----------------------------|
| Promise | “Build your India team. Keep control. See every cost.” |
| Primary buyer | COO / CFO / founder / HR or engineering leader hiring 1–50 India employees from UK/US/EU/AU |
| Primary conversion | Qualified consultation + indicative cost estimate |
| Secondary | Save / request reviewed quote |
| Existing customer | Client portal sign-in, separated from sales CTAs |

## Public marketing routes (verified)

| Route | File | Maturity | Notes |
|-------|------|----------|-------|
| `/` | `(site)/page.tsx` | **Partial** | Rich sections (companies, services, process, compare, FAQ) but **group-first** narrative; no product cost dashboard, no estimator teaser |
| `/employer-of-record-india` | `(site)/employer-of-record-india/page.tsx` | **Stub** | Single column + contact CTA; not flagship SEO depth |
| `/pricing` | `(site)/pricing/page.tsx` | **Partial** | Three descriptive cards only; **no numeric calculator** |
| `/how-it-works` | `(site)/how-it-works/page.tsx` | **Stub** | Static six-step list; no owners, gates, or documents |
| `/how-we-work` | `(site)/how-we-work/page.tsx` | **Marketing** | Separate from `/how-it-works` — **IA duplication risk** |
| `/platform` | `(site)/platform/page.tsx` | **Stub** | Title + one paragraph |
| `/compliance` | `(site)/compliance/page.tsx` | Exists | Content depth not re-audited line-by-line |
| `/security` | `(site)/security/page.tsx` | Exists | Claim inventory required before publish |
| `/fx-transparency` | `(site)/fx-transparency/page.tsx` | Exists | Align with FX policy docs; no “zero markup” without evidence |
| `/contact` | `(site)/contact/page.tsx` | **Partial** | Form via `/api/contact`; lacks qualification fields (headcount, start date, booking) |
| `/book-demo` | `(site)/book-demo/page.tsx` | Exists | Verify scheduling integration before CTA goes live |
| `/faq` | `(site)/faq/page.tsx` | **Marketing** | Copy-driven |
| `/about`, `/companies`, `/services`, `/who-we-serve`, `/careers` | various | **Marketing** | Support group story; may dilute EOR funnel unless nav is reordered |
| `/privacy`, `/terms`, `/cookies` | various | Legal | Counsel review required |
| `/verify-document` | outside `(site)` group | **Functional** | Payslip verification (no salary data) |

### Proposed IA vs current nav

`SiteHeader` links: Companies, Services, How we work, Pricing, FAQ — **no** Platform, Compliance, EOR India, or Client login in primary nav. Footer lists portal logins but not `/login/client`.

**Gap:** Buyer path in audit (Why NOVA → How it works → Pricing → Platform → Compliance → Get a quote) is **not reflected** in header IA.

## Content layer (`src/content/public-site/`)

| Finding | Detail |
|---------|--------|
| Site name | `Nova Group` / group framing in `en.ts` |
| Target copy pack | Audit §9 uses **NOVA EOR** eyebrow and cost-transparency hero — **not applied** in `home` strings |
| Locales | `en`, `fr`, `es` via `getSiteCopy` — pricing currency and legal text need locale review (P2) |

## Marketing UI system

| Area | As-is |
|------|--------|
| Shell | `SiteShell` + `SiteHeader`, max-width `6xl`, sticky header |
| Blocks | `blocks.tsx` — cards, `PageIntro`, `ClosingBand`, `MarketingLink` |
| Tokens | Shared `--nova-*` in `globals.css` (ink/teal); used by admin/employee portals too |
| Design lab | `.claude-design/lab` variants A–F exist; not wired to `(site)` routes |
| Visual vocabulary | Repeated bordered cards; limited product UI proof |

**Design direction (to-be):** See `MARKETING_DESIGN_SYSTEM.md` — premium B2B SaaS, marketing-only token layer, synthetic labelled portal previews (per audit §4 and design skill `ui-styling` / `design-system` routing).

## Conversion and APIs

| Capability | Status |
|------------|--------|
| Contact lead | `POST /api/contact` — email to `CONTACT_INBOX`; honeypot; **no** CRM state, UTM, or deduplication |
| Public cost estimate | **Missing** — no `POST /api/public/estimates` |
| Quote request | **Missing** — no `QuoteRequest` / `CostEstimate` Prisma models |
| Rate limiting on public APIs | Contact route: **not observed** (add in Sprint 3) |
| Booking | `/book-demo` present; **scheduling vendor not verified** |

## Client portal (handoff context)

| Area | Status on `main` |
|------|------------------|
| Auth | `/login/client` |
| Routes | `/client/[clientSlug]/…` (overview, people, costs, invoices, onboarding, etc.) |
| Data model | `ClientOrganization` and related EOR models in `schema.prisma` |
| Public synthetic demo | **Not built** — platform page is text-only |
| Marketing → KYB continuity | Backend exists; **public funnel does not expose** lifecycle states |

EOR engineering audit: `docs/eor/SPRINT0_AUDIT_REPORT.md`, `docs/eor/SPRINT_COMPLETION.md`.

## Security (Sprint 0)

| Item | Status |
|------|--------|
| Passwords in README | **Remediated** — README points to seed console output only |
| `SEED_DEV` in production | **Guarded** in `prisma/seed.ts` |
| Seed script stdout | Still prints demo passwords when `SEED_DEV=1` — acceptable for local dev only |
| Credential rotation | **Operator** — `docs/eor/CREDENTIAL_ROTATION_RUNBOOK.md` |
| Contact PII | Sent via email adapter; ensure production email + domain auth configured |

## Gap matrix (priority)

| Priority | Gap | Sprint |
|----------|-----|--------|
| P0 | Homepage EOR + cost transparency story, product preview, CTA pair | 2 |
| P0 | Interactive pricing / estimate engine + disclaimers | 3 |
| P0 | Flagship `/employer-of-record-india` depth | 2 |
| P0 | Interactive `/how-it-works` with gates and deliverables | 4 |
| P0 | Trust claims inventory (no unverified certifications) | 2–5 |
| P1 | Nav/footer IA, `/login/client` in header, consolidate how-we-work vs how-it-works | 1–2 |
| P1 | Contact qualification + quote request API | 4 |
| P1 | Platform tour (synthetic UI) | 5 |
| P1 | SEO schema/sitemap/canonical pass | 5 |
| P2 | Locale pricing currency and legal strings | 5+ |

## Regression baseline (local)

Run before Sprint 1 code changes:

```bash
npm run typecheck
npm test
npm run build
```

## Approvals required before Sprint 1 implementation

Per master execution prompt — **stop here** until sign-off on:

1. This audited backlog (`SPRINT_BACKLOG.md`)
2. Homepage wireframe (`HOMEPAGE_WIREFRAME.md`)
3. Pricing fee model and disclaimers (business owner decisions §14 of audit)
4. Legal disclosures for compliance/security/FX pages

## References

- Sprint plan source: uploaded `NOVA_Public_Website_UX_Conversion_Audit_and_Cursor_Sprint_Plan_2469.md`
- Design skill: `.agents/skills/design/SKILL.md`
- Legacy UI audit: `UI_REDESIGN_AUDIT.md` (portal-focused; still valid for admin/employee)

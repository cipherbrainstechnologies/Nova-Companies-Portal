# Nova Workforce — QA report

**Date:** 13 October 2026  
**Branch:** `cursor/nova-website-revamp-eac0`

## Automated checks

| Check | Result |
|-------|--------|
| `npm run lint` | Pass (pre-existing warnings only) |
| `npm run typecheck` | Pass |
| `npm run test` | Pass (155 tests) |
| `npm run build` | Pass |
| `npm run test:e2e` | Pass after `npx playwright install chromium` (smoke + client API) |

## Responsive manual testing

Browser verification at **390px** and **1440px** (computerUse agent):

| Page | 390px | 1440px | Notes |
|------|-------|--------|-------|
| `/` | OK | OK | Hero, value strip, mobile menu open/close |
| `/contact` | OK | OK | Form layout |
| `/employer-of-record-india` | OK | OK | |
| `/services/payroll` | OK | OK | |
| `/how-it-works` | OK | OK | |
| `/india-hiring-guide` | OK | OK | |

No horizontal overflow or overlapping CTAs observed in tested viewports.

## Viewports not individually exercised

360px, 768px, 1024px, 1920px — layout uses fluid `clamp()` and Tailwind breakpoints; no issues reported in build or spot checks.

## Accessibility

- Skip link, landmarks (`header`, `main`, `footer`)
- Keyboard-dismissible mobile menu (Escape)
- FAQ accordions via `<details>` / `<summary>`

Lighthouse scores not run in this environment (no production URL with secrets).

## Regressions

- Login e2e assertion updated to match chooser heading ("Choose your portal") — pre-existing copy drift.

## Outstanding

- End-to-end contact form submission requires production `RESEND_API_KEY` and `CONTACT_INBOX`.
- `/book-demo` scheduling integration not verified.
- Counsel review for legal pages unchanged from prior state.

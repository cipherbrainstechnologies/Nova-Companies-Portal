# Nova Workforce — commercial route map

**Date:** 13 October 2026  
**Scope:** Public marketing routes under `src/app/(site)/`. Portal, admin, and employee routes are unchanged.

## Findings

| Severity | Route | Evidence | Action |
|----------|-------|----------|--------|
| High | `/pricing` | Page led with an indicative salary worksheet and three generic cards. No published per-employee service fee. | Rewrite around Essential ₹5,000, Managed ₹7,500, Enterprise custom. Keep the worksheet below the plans. |
| High | `/fx-transparency` | One paragraph. No settlement currencies, quote timestamps, or shortfall explanation. | Rewrite in place as FX & payments. |
| High | `/security` | One paragraph. No employment, privacy, or incident content. | Rewrite in place as Trust & compliance. |
| Medium | `/compliance` | Same one-sentence claim as the old security/compliance stub. | 301 to `/security`. |
| Medium | `/book-demo` | Heading plus a link to `/contact`. | 301 to `/contact`. |
| Low | `/how-we-work`, `/services/payroll` | Already redirected. | Keep the existing 301s. Remove them from the sitemap. |

`/fx-transparency` and `/security` stay at the same URLs so existing links and the sitemap entries remain valid.

## Route inventory

| Route | Decision | Why |
|-------|----------|-----|
| `/` | KEEP | Primary conversion page. |
| `/pricing` | REWRITE | Published service fees, comparison, and the existing cost worksheet. |
| `/fx-transparency` | REWRITE | FX & payments. URL kept. |
| `/security` | REWRITE | Trust & compliance. URL kept. |
| `/employer-of-record-india` | KEEP | Core service page. |
| `/india-payroll-services` | KEEP | Core service page. |
| `/hire-employees-in-india` | KEEP | Core service page. |
| `/india-employment-compliance` | KEEP | Service detail. Linked from Trust. |
| `/how-it-works` | KEEP | Process page. |
| `/india-hiring-guide` | KEEP | Substantive guide. Footer only. |
| `/faq` | KEEP | Existing answers. Footer only. |
| `/about` | KEEP | Company introduction. |
| `/companies` | KEEP | Named employing entities. |
| `/contact` | KEEP | Working enquiry form. |
| `/services` | KEEP | Short index. Not in the header. |
| `/who-we-serve` | KEEP | Short audience page. Not in the header. |
| `/platform` | KEEP | Portal description. Not in the header. |
| `/careers` | KEEP | Points to employee sign-in. |
| `/privacy`, `/terms`, `/cookies` | KEEP | Legal pages. Thin, but they are the policy record. |
| `/how-we-work` | REDIRECT | Already 301 to `/how-it-works`. |
| `/services/payroll` | REDIRECT | Already 301 to `/india-payroll-services`. |
| `/book-demo` | REDIRECT | 301 to `/contact`. |
| `/compliance` | REDIRECT | 301 to `/security`. |

No marketing route was deleted. Redirected URLs remain in `next.config.ts`.

## Navigation

Header: Services, How it works, Pricing, Resources (FX & payments, Trust & compliance), Contact, Client login, Talk to an Expert.

Why Nova stays on the homepage and leaves the header. The hiring guide and FAQ stay in the footer.

## Pricing boundary

Published fees live in `src/content/public-site/commercial-plans.ts`.

`resolvePublicPricingPlan` and `buildEmployerCostEstimate` are unchanged. The worksheet can still show a configured or zero service-fee line. The plan cards are the published fees until operations maps `PublicPricingPlan` to those amounts.

## FX boundary

`src/lib/public/fx-illustration.ts` is illustrative and uses sample rates. It does not call `getIndicativeFxQuote` or `createFxQuote`. The estimate engine’s indicative spread is unchanged.

## Trust boundary

Published controls are limited to tenant isolation, permissioned modules, private file storage, payslip download audit, payslip emails without salary figures, public verification without salary or bank data, and secrets supplied by the host environment. No ISO, SOC 2, Cyber Essentials, or GDPR certification is claimed.

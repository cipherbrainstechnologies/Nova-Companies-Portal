# Nova Workforce — content map

Primary copy: `src/content/public-site/en.ts`. Locales `fr` and `es` inherit structural keys from English with partial translations.

## Public routes

| Route | H1 source | Primary CTA |
|-------|-----------|-------------|
| `/` | `home.title` | Book a consultation → `/contact` |
| `/employer-of-record-india` | `eorIndia.title` | Book a consultation |
| `/services/payroll` | `payrollCompliance.title` | Book a consultation |
| `/how-it-works` | `howItWorksPage.title` | Book a consultation |
| `/india-hiring-guide` | `indiaHiringGuide.title` | Book a consultation |
| `/about` | `about.title` | Contact |
| `/contact` | `contact.title` | Form → `POST /api/contact` |
| `/pricing` | `pricing.title` | Calculator + quote request |
| `/faq` | `faq.title` | Contact |

## Claims requiring business sign-off

- Employing entity names in footer (`footer.legalEntity`)
- Commercial fee amounts (only on reviewed proposals / calculator assumptions)
- Certifications, client logos, insurance guarantees (not published unless verified)

## Entity boundaries

Nova Workforce and Nova Qore are described as separate employers. See `docs/eor/ENTITY_BOUNDARIES.md`.

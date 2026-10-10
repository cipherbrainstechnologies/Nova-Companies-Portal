# Homepage wireframe (approval draft)

Aligns with audit §5 and content pack §9. **Not implemented in code** until Sprint 2 sign-off.

## Navigation

| Item | Href | Notes |
|------|------|-------|
| Logo | `/` | NOVA wordmark |
| Why NOVA | `/#differentiation` or dedicated section | |
| How it works | `/how-it-works` | Prefer over `/how-we-work` long term |
| Pricing | `/pricing` | |
| Platform | `/platform` | |
| Compliance | `/compliance` | |
| Resources | `/faq` | Expand later |
| Client login | `/login/client` | Distinct from employee/admin |
| Primary CTA | `/pricing` or `/contact` | **Get a quote** |

Mobile: drawer + persistent **Get a quote** button.

## Section order

### 1. Hero

- **Eyebrow:** INDIA EMPLOYER OF RECORD
- **H1:** Your India team. Your way. Every cost explained.
- **Subhead:** Hire and manage India-based employees without setting up a local entity. NOVA handles employment administration, payroll and local compliance processes while your team directs the work.
- **CTAs:** [Calculate employment cost] → `/pricing` · [Book a consultation] → `/contact` or verified booking URL
- **Secondary:** Already a client? [Sign in](/login/client)

### 2. Product proof

Read-only **cost dashboard** mock (3 employees): salary, employer contributions, benefits, EOR fee, FX, invoice status.  
Banner: **Illustrative data — not a live account.**

### 3. Differentiation (3 columns)

1. Transparent employee-level cost  
2. Flexible day-to-day team management  
3. Local employer and compliance operations  

### 4. Estimator teaser

Inputs: monthly gross (INR), headcount, billing currency → **See full estimate** deep-links to `/pricing?salary=&headcount=&currency=` (no PII).

### 5. Control vs responsibility

Two-column: **You** (work priorities, performance input) vs **NOVA** (legal employment, payroll). Footnote on joint review for sensitive HR decisions.

### 6. Onboarding timeline

Six steps from audit `/how-it-works` STEPS — each expandable: owner, deliverable, gate.

### 7. Portal walkthrough

Tabs: Employees | Costs | Invoices | Approvals | Documents — synthetic UI + one-line benefit each.

### 8. Cost transparency explainer

Line items: salary, statutory employer, insurance, fee, tax review flags, FX methodology link.

### 9. Trust / evidence

Entity disclosure, security process summary, **no** fake testimonials or uncertified SOC/ISO badges.

### 10. FAQ

Accordion: employer of record, pay runs, approvals, FX, deposits, exit, IP, data security.

### 11. Closing CTA

**H2:** Know your India hiring costs before you commit.  
Buttons: [Get your estimate] [Talk to NOVA]

### 12. Footer

Contracting entity, privacy/terms/cookies, support email, client + employee login links.

## Content migration

Replace group-first `home` strings in `src/content/public-site/en.ts` (and fr/es) after copy approval. Retain `/companies` for group story but demote in nav.

## Acceptance (Sprint 2)

- [ ] Hero matches approved copy and CTA pair  
- [ ] Product preview labelled illustrative  
- [ ] Estimator teaser passes query params to pricing  
- [ ] Mobile CTA visible without horizontal scroll at 320px  
- [ ] Client login does not replace primary quote CTA  
- [ ] Lighthouse smoke + keyboard nav on new sections  

# Super Admin business operating system

Phase 0 audit and the first read-only release. No payroll, payslip, invoice, or pricing-agreement behaviour was changed.

## What already existed

- Next.js App Router, Prisma, and session roles. Super Admin pages use `requirePageUser(["SUPER_ADMIN", "OPERATIONS_MANAGER"])`.
- Authoritative client records: `ClientOrganization`, `ClientOnboardingCase`, `LegalTemplate`, `ClientLegalDocument`, `SignatureEnvelope`, `NovaEntityClientAgreement`, `AgreementDocument`, `ClientPricingAgreement`, and the activation gates in `src/server/client/activation.ts`.
- Employees belong to a Nova `Company`. `EmploymentAssignment` links an employee to a client. There is no separate internal-staff flag.
- `ClientInvoice` lines mix employment-cost snapshots and a platform-fee line. `issueClientInvoice` already separates those lines. Posted invoices were not mutated.
- The old `/admin/dashboard` counted companies, statement review, and payslips. It did not report EOR revenue, receivables, or client pipeline.
- Admin UI tokens are ink and teal in `globals.css`. Public-site navy and purple are limited to `[data-marketing="true"]`.
- There is no reminder scheduler for agreement expiry, and no cleared-cash balance tied to `PayrollFundingRequest`. Client-level operating costs are not stored, so contribution margin cannot be calculated. `FXSettlement.varianceAmount` has no currency column; recorded amounts are treated as INR.

## What this release adds

| Surface | Route | Behaviour |
| --- | --- | --- |
| Business overview | `/admin/dashboard` | Database metrics, month and dimension filters in the URL, action preview, payroll operations kept underneath |
| Tasks | `/admin/tasks` | Same action list, filterable by kind |
| Workforce | `/admin/workforce` | Client assignments separated from Nova staff who have no client assignment |
| Client 360 summary | `/admin/clients/[clientId]` | Headcount, EOR MRR, receivables, employees, pricing, invoices, and recent activity on the existing workspace |

Metric definitions are in `METRIC_DEFINITIONS` inside `src/server/admin/business-metrics.ts` and on the overview page. A metric that cannot be calculated is labelled Unavailable. Empty FX history is not shown as a zero variance.

## Preserved

Activation gates, legal-document execution, pricing-agreement semantics, payroll calculation, and invoice issuance are unchanged. Client portal access still requires `ACTIVE`.

## Not in this release

- Reminder policies, email deduplication, and a scheduler
- Draft-validate-review-confirm flows for salary, bank details, and custom pricing
- A new permission matrix beyond the existing Super Admin and Operations Manager page guard
- Contribution margin, payroll-funding coverage against cleared cash, and automated FX conversion between currencies
- Production migration or deployment

## Tests

`tests/business-metrics.test.ts` covers calendar bounds, the reimbursement-versus-fee split, duplicate assignments, mixed currencies, uncontracted employees, void invoices, and internal versus client workforce.

## Deployment

No migration. The new pages read existing tables. They are safe to ship with the web app and do not require a worker.

# Backend Architecture

## Payroll issuance

- Payroll operations are owned by `src/server/payroll/payroll-facade.ts` and re-exported through the shared facade directory.
- A payslip can be queued only when its payroll run and every selected line are `APPROVED`.
- The issue confirmation must exactly match company, month, and unique selected-line count.
- Issuance first transitions records to `ISSUING`; the queue worker renders, stores, hashes, and marks the document `ISSUED`.
- Corrections append an immutable `PayslipVersion`; prior PDF and calculation snapshots remain preserved.
- Public verification returns document validity and provenance only. Salary and bank data are excluded.

## Tax projection

- TDS projections consume financial-year slab configuration. Statutory slabs are not fixed in application code.
- Old and new regimes are selected explicitly and projections carry an estimate disclaimer.

## Profit reporting

- Earned operating profit is revenue minus business expenses.
- Owner-excluded and financing/personal outgoings are then deducted to derive cash remaining.
- Bank balance is not profit and must never be labelled as such.
- Company policy rules are priority-ordered and can match narration patterns or transaction classification.

## Portal surfaces and API boundaries

- App Router admin pages use a shared server-rendered navigation shell and restrict records to companies granted for the relevant module.
- Admin API routes authenticate sessions, validate input with Zod, require module/action permissions, and resolve resource company ownership before mutation or disclosure.
- Employee payslip downloads validate payslip ownership, issue short-lived private-storage URLs, and append `DocumentDownloadAudit` records.
- Public document verification exposes validity and provenance only; salary and bank details are never returned.
- Password reset, forced password change, admin operations, employee self-service, statement reconciliation, payroll, TDS, and profit reporting are exposed through dedicated App Router pages.

## Admin interface system

- All admin pages use the Swiss Industrial Print system through `AdminShell`, `@/components/ui`, and `@/components/industrial`.
- Administrative data is presented with hard two-pixel borders, square corners, uppercase monospace metadata, Archivo Black macro headings, and the single red hazard accent.
- Company-scoped admin views use `CompanyTabs`; summary metrics use `StatCell`; operational records use `DataRow`.
- Legacy rounded cards, soft shadows, gradients, and secondary accent palettes are prohibited on admin surfaces.

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

- Visual system: premium SaaS payroll UI (Nova ink + teal tokens in `globals.css`).
- Shells: `AdminShell` (desktop sidebar, mobile drawer, profile/logout) and `EmployeeShell` in `src/components/admin-shell.tsx`.
- Shared primitives: `src/components/ui.tsx` (Button/Input/Card) and `src/components/industrial.tsx` (StatCell, DataRow, CompanyTabs, StatusBadge, EmptyState, MoneyValue, AlertBanner, PublicChrome).
- Soft borders, 8px spacing scale, sentence-case typography (Plus Jakarta Sans). Industrial/Desert Rose styling is retired.
- Audit of preserved routes: `UI_REDESIGN_AUDIT.md`.

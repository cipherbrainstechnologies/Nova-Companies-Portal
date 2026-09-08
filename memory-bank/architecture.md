# Backend Architecture

## Payroll issuance

- Payroll operations are owned by `src/server/payroll/payroll-facade.ts` and re-exported through the shared facade directory.
- A payslip can be queued only when its payroll run and every selected line are `APPROVED`.
- The issue confirmation must exactly match company, month, and unique selected-line count.
- Issuance first transitions records to `ISSUING`; the queue worker renders, stores, hashes, and marks the document `ISSUED`.
- Corrections append an immutable `PayslipVersion`; prior PDF and calculation snapshots remain preserved.
- Public verification returns document validity and provenance only. Salary and bank data are excluded.
- `createPayrollRun` returns an existing run for the same company/year/month instead of failing on the unique constraint.
- Live HTML preview (`POST /api/payroll/preview`) builds `PayslipRenderData` from employee + form input without inventing a payslip row.
- PDF generation uses `renderPayslipHtmlFromTemplate` when the payslip version’s `CompanyTemplate` has `htmlBody`; otherwise the default Form IV-B layout.

## Payroll automation and reconciliation

- Expected monthly net is the single reconciliation reference: `monthlyGross − monthlyTds − monthlyPt`, or an explicit `expectedMonthlyNet` override. Derivation lives in `src/server/payroll/salary-structure.ts` and is shared by API, UI and tests.
- `decidePaymentAutomation` (`payment-decision.ts`) maps a bank debit to `MATCHED_EXACT`, `PARTIAL_PAYMENT_REVIEW_REQUIRED`, `AMOUNT_MISMATCH_REVIEW_REQUIRED`, `UNMATCHED` or `SALARY_STRUCTURE_INCOMPLETE`. Only an exact match may auto-issue, and only when the company sets `autoIssueExactMatches`.
- Match candidates are always company-scoped, so a same-named employee at another company cannot be suggested. A confident match is downgraded when a payroll line already exists for that employee in the statement's salary month.
- `applyAutomaticReconciliation` records decisions, auto-creates payroll lines from the saved salary structure for exact/partial/mismatch rows, and batch auto-issues exact matches when `autoIssueExactMatches` is ON. Partial/mismatch drafts stay `DRAFT` and invisible to employees. Reviewed and issued rows are never re-decided.
- `reviewReconciliationTransaction` approves variances into `APPROVED_FOR_ISSUE` payroll lines (requires classification + reason). Ignore/reject/non-payroll require a reason.
- Issue is guarded twice: the API rejects a selection containing unresolved lines, and `issueSelectedPayslips` re-checks with `partitionIssuableLines`.
- Payslip notifications carry no salary figures — `assertNoSalaryAmounts` fails the build of any message containing currency-shaped text. Delivery state on `PayslipEmailDelivery` is independent of issue state: a failed email marks the transaction `EMAIL_FAILED` but never un-issues the payslip.
- Salary structures are versioned: every save snapshots the outgoing revision into `EmployeeSalaryStructureVersion` with an `effectiveTo` boundary. Employee creation records revision 1 up front, together with the bank account-holder name and any payment aliases, so a new hire is matchable from the first statement.
- `salary-structure.ts` also owns the canonical component vocabulary (`DEFAULT_EARNING_CODES`, `DEFAULT_DEDUCTION_CODES`). `componentsFromJson` normalises stored payloads to canonical codes, `structureToEarningsDeductions` turns a structure into payslip lines with totals, and `toSalarySnapshot` produces the JSON-safe record for `PayrollEmployeeLine.calculationSnapshotJson`. The module stays free of Prisma and queue imports so it remains unit-testable and client-safe.
- `resolveExpectedMonthlyNet` is the `Decimal`-tolerant wrapper used against persisted rows: stored figures first, then the component payload, so structures captured only as components still reconcile.
- Match suggestion generation lives in `reconciliation-automation.ts` alongside the rest of the pipeline. `matcher-integration.ts` is retained only as a re-export shim for existing importers.
- Audit action names are centralised in `src/server/payroll/audit-actions.ts` and grouped by stage (match → approve → issue → email).

## Templates

- Template ownership lives in `src/server/templates/template-facade.ts` (re-exported from `src/server/facades/template-facade.ts`).
- Creating a version deactivates prior active templates, increments `version`, optionally stores the source file via `storePrivateFile`, and activates the new row.
- Template preview uses labelled sample payslip data only (`POST /api/templates/preview`).

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

## Railway deployment

- Infrastructure as Code lives in `.railway/railway.ts` (postgres, redis, payslip-files bucket, web, worker).
- Root `Dockerfile` builds one image for web (`npm start`) and worker (`npm run worker`), including Playwright Chromium for payslip PDFs.
- Web service runs `npx prisma migrate deploy` as `preDeploy` and health-checks `/api/health`.
- Production secrets (`AUTH_SECRET`, `OTP_PEPPER`, optional email/PDF signing) are set in Railway variables and marked `preserve()` in IaC.
- `APP_URL` falls back to `https://$RAILWAY_PUBLIC_DOMAIN` when unset.
- Object storage uses Railway Buckets via `S3_*` env mapping; local MinIO remains for docker-compose development.

## Admin interface system

- Visual system: premium SaaS payroll UI (Nova ink + teal tokens in `globals.css`).
- Shells: `AdminShell` (desktop sidebar, mobile drawer, profile/logout) and `EmployeeShell` in `src/components/admin-shell.tsx`.
- Company workspace: `src/app/admin/companies/[companyId]/layout.tsx` wraps nested module routes with `AdminShell` + `CompanyHub` (breadcrumb, sticky module tabs under `/admin/companies/[companyId]/…`, optional company switcher).
- Shared primitives: `src/components/ui.tsx` (Button/Input/Card) and `src/components/industrial.tsx` (StatCell, DataRow, CompanyTabs, StatusBadge, EmptyState, MoneyValue, AlertBanner, PublicChrome).
- Soft borders, 8px spacing scale, sentence-case typography (Plus Jakarta Sans). Industrial/Desert Rose styling is retired.
- Audit of preserved routes: `UI_REDESIGN_AUDIT.md`.

# Nova Companies Portal — Implementation Status

## Phase checklist

| Phase | Status | Notes |
|------|--------|-------|
| 1. Scaffold, DB, auth, RBAC, audit | Complete | Next.js 15, Prisma, sessions, OTP, deny-by-default permissions, audit log |
| 2. Company/employee CRUD + employee portal | Complete | Facades, ID sequences `PREFIX-0001`, admin + employee routes |
| 3. Salary structures, templates, PDF | Complete | Form IV B HTML template, payroll facade, PDF generator + verify-document |
| 4. Statement upload + Axis parser | Complete | S3 upload, BullMQ parse, Axis PDF/text + CSV/XLSX parsers |
| 5. Reconciliation, matching, issue | Complete | Classification, scoring, confirmation-gated issue, download audit |
| 6. TDS + finance/profit | Complete | Statement ledger; Apr-2025 NW earned ₹3,82,217.27; clear/reprocess; employee CSV import |
| 7. Marketing, tests, Railway guide | Complete | Public `/`, Vitest, Playwright smoke, `docs/RAILWAY_DEPLOYMENT.md` |
| 8. Premium UI/UX redesign | Complete | Tokens, AppShell, all admin/employee/auth surfaces restyled; logic preserved |
| 9. Company hub + template/slip form | Complete | Nested company tabs; template upload/preview; employee salary-slip form with preview → draft/approve/issue |
| 10. Payroll automation | Complete | Salary structures with versions, statement→payroll reconciliation decisions, review workflow, approved-only issue, payslip email delivery tracking |

## Finance ledger + employee CSV (2026-09-08)

See `FINANCE_EMPLOYEE_CSV_HANDOFF.md` and `FINANCE_RECONCILIATION_BUG_REPORT.md`.

- Clear/reprocess Super Admin flow; statement opening/closing validation; monthly ledger API/UI
- Confirmed Apr-2025 policy: Love = owner outflow; municipal = company expense; earned ₹3,82,217.27
- Employee CSV import with `CONTACT_DETAILS_REQUIRED` (no fake phone/email/login)

## Finance reconciliation fix (2026-09-08)

Root cause of April 2025 **Revenue ₹0 / negative profit**: default policies lacked Sana Life
**credit** revenue rules, so credits were skipped while some debits (including false-positive
`HARDIK`→`HARDIKKUMAR`) still reduced profit.
Full trace: `FINANCE_RECONCILIATION_BUG_REPORT.md`.

- Earned profit = business credits − salaries − OT − Hardik cash − CBDT (unclassified excluded)
- Direction-aware NW/NQ rules; snapshot invalidate + Recompute; MoM growth gated on complete months
- Fixtures: `tests/profit-engine.test.ts`, `tests/workforce-april-2025-pdf.test.ts`, `upload/WORKFORCE-*.PDF`

## Payroll automation (2026-09-08)

Bank statements are reconciled against each employee's **expected monthly net**
(`monthlyGross − monthlyTds − monthlyPt`, or an explicit override). Exact, partial, and
mismatch matches **auto-create** payroll lines from the saved salary structure. Only an
exact match can be **auto-issued**, and only when the company opts in. Partial payments,
amount mismatches, incomplete structures and unmatched debits always wait for a human
decision before employee visibility or email.

### Decision matrix

| Bank debit vs expected net | Reconciliation status | Auto payroll line | Auto issue |
|---|---|---|---|
| Equal (±0.01) | `MATCHED_EXACT` | yes | only if `autoIssueExactMatches` |
| Lower | `PARTIAL_PAYMENT_REVIEW_REQUIRED` | yes | never |
| Higher | `AMOUNT_MISMATCH_REVIEW_REQUIRED` | yes | never |
| No confident candidate | `UNMATCHED` | no | never |
| Structure missing/incomplete | `SALARY_STRUCTURE_INCOMPLETE` | no | never |

Match candidates are built from the statement's own company only, so a same-named employee
at another company can never be suggested. A confident match is additionally downgraded when
a payroll line already exists for that employee in the statement's salary month.

### Files added

- Server: `src/server/payroll/salary-structure.ts`, `payslip-email.ts`, `audit-actions.ts`,
  `reconciliation-automation.ts`
- API: `src/app/api/employees/[employeeId]/salary-structure/route.ts` (GET/PUT),
  `src/app/api/statements/transactions/[transactionId]/review/route.ts` (POST),
  `src/app/api/payslips/[payslipId]/resend-email/route.ts` (POST)
- UI: `src/app/admin/employees/salary-structure-form.tsx`,
  `src/app/admin/statements/reconciliation-review-controls.tsx`,
  `src/app/admin/payroll/approval-summary.tsx`, `issue-approved-button.tsx`,
  `src/app/admin/payslips/email-delivery-panel.tsx`, `resend-email-button.tsx`,
  `src/app/admin/companies/automation-settings-form.tsx`,
  `src/components/reconciliation-status.tsx`
- Tests: `tests/payroll-automation.test.ts`

### Files changed

- `src/server/payroll/payment-decision.ts` — issue guards (`partitionIssuableLines`,
  issuable/unresolved status sets)
- `src/server/payroll/matcher-integration.ts` — alias + account-holder + expected-net
  candidates, company `matchScoreThreshold`
- `src/server/payroll/payroll-facade.ts` — `queuePayslipEmail`, `markEmailDelivery`,
  `resendPayslipEmail`, unresolved-line issue guard
- `src/server/facades/employee-facade.ts` — versioned `upsertSalaryStructure` with aliases
  and account-holder name; `listSalaryStructureVersions`
- `src/server/facades/company-facade.ts` — `autoIssueExactMatches`,
  `emailDeliveryPreference`, `matchScoreThreshold`
- `src/server/statements/statement-service.ts` — `salaryYear`/`salaryMonth` on upload; runs
  automatic reconciliation after parsing
- `src/server/api-helpers.ts` — `authorizeAny` (primary permission with fallback)
- `src/server/rbac/permissions.ts` — `NAMED_PERMISSIONS`, `PERMISSION_FALLBACKS`
- `src/server/queue/queues.ts`, `src/worker/index.ts` — email jobs carry `deliveryId`, and
  the worker records SENT/FAILED
- `src/app/api/companies/[companyId]/route.ts`, `src/app/api/statements/route.ts`,
  `src/app/api/payroll/runs/[runId]/issue/route.ts`
- `src/app/admin/statements/reconciliation-panel.tsx` (rewritten),
  `upload-form.tsx`, `src/app/admin/employees/create-form.tsx`,
  `src/app/admin/companies/[companyId]/employees/[employeeId]/page.tsx`,
  `src/app/admin/payroll/page.tsx`, `src/app/admin/companies/[companyId]/payroll/page.tsx`,
  `src/app/admin/companies/[companyId]/page.tsx`, `src/app/admin/payslips/page.tsx`
- `tests/matching.test.ts` — alias scoring still caps at 100

### Permissions

| Route | Module / action |
|---|---|
| `PUT/GET /api/employees/[id]/salary-structure` | `salaryStructure/edit` (fallback `employees/edit`), `salaryStructure/view` (fallback `employees/view`) |
| `POST /api/statements/transactions/[id]/review` | `statements/reconcile` |
| `POST /api/payslips/[id]/resend-email` | `payslips/resendEmail` |
| `POST /api/payroll/runs/[id]/issue` | `payroll/issue` |
| `PATCH /api/companies/[id]` | `companies/edit` |

### Migration

`prisma/migrations/20260908010000_payroll_automation/migration.sql` adds the
`ReconciliationStatus`, `EmailDeliveryStatus`, `EmailDeliveryPreference` and
`VarianceClassification` enums; company automation columns; salary-structure amount columns;
statement `salaryYear`/`salaryMonth`; transaction reconciliation columns; payroll-line
payment columns; and the `EmployeePaymentAlias`, `EmployeeSalaryStructureVersion` and
`PayslipEmailDelivery` tables.

```bash
npx prisma migrate deploy    # or: npx prisma migrate dev
npx prisma generate
```

### Email / storage configuration

- `EMAIL_PROVIDER=resend` + `EMAIL_API_KEY` + `EMAIL_FROM` to send for real; otherwise the
  console adapter logs the message.
- `APP_URL` is used for the sign-in link in the notification body.
- Notification bodies are asserted free of salary amounts by
  `assertNoSalaryAmounts`; the payslip PDF stays behind the authenticated download.
- Delivery outcome is recorded on `PayslipEmailDelivery`; a failed or bounced email marks the
  transaction `EMAIL_FAILED` but never un-issues the payslip.
- PDFs and statements still require S3/MinIO (`S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`,
  `S3_SECRET_ACCESS_KEY`). Reconciliation itself needs no object storage.

## UI redesign (2026-09-08)

- Audit: `UI_REDESIGN_AUDIT.md`
- Tokens: light canvas, Nova ink `#0c2d3f`, primary teal `#0f766e`, soft radius/shadows
- Typography: Plus Jakarta Sans
- Shells: grouped admin sidebar + mobile drawer; employee top nav; profile logout
- Statement upload: drag-and-drop zone + guided stepper chrome
- Dashboard: action-required banner, workforce/payroll widgets, recent audit
- No backend/schema/API contract changes for the redesign

## Commands run

```bash
npm test                 # 46 tests passed (9 files)
npm test -- payroll-automation   # 24 payroll automation scenarios
npm run typecheck        # passed
npm run lint             # passed
npm run build            # passed (Next.js 15.5.25)
```

## Completed files (high level)

- `prisma/schema.prisma` + migration `20260907174536_init`
- `src/server/auth/*`, `src/server/rbac/*`, `src/server/facades/*`
- `src/server/statements/*`, `src/server/payroll/*`, `src/server/tds/*`, `src/server/finance/*`
- `src/worker/index.ts`, `src/app/api/**`, `src/app/admin/**`, `src/app/employee/**`
- `src/components/ui.tsx`, `industrial.tsx`, `admin-shell.tsx`, `payslip-folder-browser.tsx`
- `messages/catalog.json` (en/fr/es), `docs/RAILWAY_DEPLOYMENT.md`, `.env.example`
- `tests/**`, `e2e/smoke.spec.ts`, `UI_REDESIGN_AUDIT.md`

## Known constraints / limitations

- Reference payslip/statement PDFs were not in the repo; parser/PDF tests use fixtures matching the execution-plan examples.
- PDF generation prefers Playwright Chromium; falls back to a minimal PDF writer if browsers are unavailable.
- Object storage requires MinIO/S3 credentials; uploads fail without a reachable bucket.
- Email uses console adapter unless `EMAIL_PROVIDER=resend` + `EMAIL_API_KEY` are set.
- `SEED_DEV=1` only — never seed production.
- Permission **editing** UI remains summary-only (grant mutation still via seed/admin config); matrix editor deferred.
- Full multi-step forgot-password wizard (masked email list + OTP on one flow) still uses existing two-page request/reset APIs.
- Company workspace hub (`CompanyHub`) keeps Overview / Employees / Templates / Statements / Payroll / Payslips / TDS / Finance under `/admin/companies/[companyId]/…` with sticky tabs and breadcrumb back to Companies.

## Auth seed (SEED_DEV=1)

| Portal | Identifier | Password |
|---|---|---|
| Admin | `thenovaworkforce@gmail.com` (Love Chauhan) | `Swrit#1311` |
| Employee | `NW-0020` or `+919888000020` | `DemoEmp#1311` |

Separate gates: `/login/admin` and `/login/employee`.

## Document folders

- Payslips: `payslips/{PREFIX}/{EMPLOYEE_CODE_Last_First}/{YYYY-MM}/Payslip_{CODE}_{YYYY-MM}_vN.pdf`
- Profit: `profit/{PREFIX}/{YYYY-MM}/Profit_Sheet_{PREFIX}_{YYYY-MM}.json`

## Next precise task

Operate locally with `npm run dev` + `npm run worker` after `npx prisma migrate deploy`,
or deploy per `docs/RAILWAY_DEPLOYMENT.md`. Enable company `autoIssueExactMatches` when
exact net-salary transfers should issue without further review.

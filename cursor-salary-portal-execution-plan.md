# Cursor Execution Plan — Railway Salary-Slip Portal

**Project:** Multi-company Salary Slip Delivery & Finance Portal  
**Deployment target:** Railway  
**Reference files supplied:** August 2026 payslip for Dheeraj Yadav and Axis Bank NovaQore statement (18 Aug–7 Sep 2026)  
**Implementation instruction:** Build this as a production-minded greenfield application. Do not use mock payroll data as the primary path. Seed data is allowed only behind a development-only command.

---

## 1. Your role and non-negotiable delivery standard

Act as a senior full-stack engineer, security engineer, and Indian payroll-product engineer. Implement the complete application incrementally, verifying each phase locally before moving to the next.

Do not merely create static screens. Every visible action must use a real API, server-side validation, database persistence, authorization and error state.

Before writing application code:

1. Inspect the existing repository.
2. Preserve any existing conventions if a project exists.
3. If no project exists, bootstrap the stack below.
4. Create `IMPLEMENTATION_STATUS.md` with a checklist and update it after every completed phase.
5. Ask only if a required secret or real company fact cannot be safely inferred; otherwise use editable admin settings and clearly label them “Needs configuration.”

## 2. Chosen stack

- Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui
- PostgreSQL + Prisma
- Railway PostgreSQL and Railway Redis
- BullMQ worker for statement parsing, PDF generation and email jobs
- Private S3-compatible object storage for original uploads and generated PDFs (Cloudflare R2 or AWS S3; never store file blobs in Postgres)
- Auth.js or a custom encrypted-session auth layer with phone-number login and email OTP recovery
- React Hook Form + Zod
- Server-side PDF rendering with Playwright or Puppeteer from controlled HTML/CSS templates
- Digital signature/integrity: signed PDF plus SHA-256 hash, verification token/QR and immutable version record
- Resend/Postmark for email; provider must be swappable through an adapter
- Vitest + Playwright for critical tests

Create separate Railway services:

| Service | Purpose |
|---|---|
| web | Next.js web/API process |
| worker | BullMQ jobs: parsing, document generation, emails |
| PostgreSQL | primary relational data |
| Redis | queues and rate limiting |

## 3. Product rules

### 3.1 Multi-company isolation

One Super Admin login manages multiple companies. Every employee, statement, payroll run, PDF, financial transaction and manager assignment belongs to exactly one `companyId`. Enforce company scoping in the server authorization layer and Prisma queries, never only through frontend filters.

Initial known companies:

- Nova Workforce (prefix: `NW`)
- Nova Qore (prefix: `NQ`)
- Future-ready: Nova Rise (prefix: `NR`)

Auto-generate employee IDs using `{company.prefix}-{sequence padded to 4 digits}`, e.g. `NQ-0001`. Keep an immutable numeric sequence per company and never reuse IDs.

### 3.2 Roles and permissions

Roles:

- `SUPER_ADMIN`: all companies/modules/settings.
- `OPERATIONS_MANAGER`: explicit company + module + action grants only.
- `EMPLOYEE`: own profile and own issued payslips only.

Permission key:

`companyId + module + action`

Modules: `dashboard, companies, employees, templates, statements, payroll, payslips, finance, tds, reports, users, audit`.

Actions: `view, create, edit, approve, issue, download, manage`.

The API must return 403 for unauthorized access even when a user manually enters a hidden route. Never rely on client-side route hiding.

### 3.3 Employee login

Employee profile must contain:

- First name, last name, designation, department, location, date of joining
- Company, auto-generated employee ID, active/blocked/exited status
- Personal email, official email — validate that at least one exists
- Primary phone, alternate phone
- Optional PAN, PF number, UAN, ESI number, bank name and account number
- Pay structure and default salary components

Authentication:

- Normal login uses normalized Indian mobile number as username + password.
- Super Admin can set/reset a temporary password; force password change at first login.
- “Forgot password” verifies the phone then sends a 6-digit OTP to an employee-selected verified personal or official email.
- OTP expires in 10 minutes, one-time use, rate limited and audit logged.
- Blocked/exited employee: deny login and revoke all sessions immediately.
- Passwords: Argon2id/bcrypt, secure cookies, CSRF protection, account lockout/rate limiting.

## 4. Reference-document rules discovered from uploads

### 4.1 Payslip template

The supplied Dheeraj Yadav August 2026 document represents an Indian Form IV B / Rule 26(2)(b) style payslip. Implement this as the first company template, rendered as a single-page A4 PDF and editable only by administrators through safe field configuration—not by employees.

Template fields required:

- Company logo, GSTIN, address
- Salary month/year
- Employee ID, employee name, designation, department, location
- PF/UAN/ESI, bank and account number, DOJ
- Working details: WD, WO, PH, PD, CL, PL, SL, LWP
- Earnings: consolidated/basic, DA, HRA, conveyance, medical allowance, special allowance, travel allowance, other allowance, bonus, leave wages, overtime
- Actual vs payable values
- Deductions: PF, ESI, PT, IT/TDS, LWF, advance, loan, other deduction/deposit, canteen/food
- Gross income, gross deductions, net amount, amount in words
- “This is a computer generated statement; hence does not require a signature.”

Do not attempt generic DOCX mail-merge at runtime. On company template upload, retain the original DOCX for reference and map it to a reviewed HTML/CSS template version. The first release must faithfully support the defined fields and single-page A4 layout. Template changes create a new version; old slips always retain the exact template version used.

Reference example to use only in a test fixture:

- Dheeraj Yadav, employee ID `NW019`
- August 2026, consolidated/basic ₹17,500; HRA ₹8,750; conveyance ₹1,200; medical ₹1,000; special ₹2,600; travel ₹1,200; other ₹2,750
- gross ₹35,000; professional tax ₹200; net ₹33,671 (the supplied layout’s payable values must be treated as the visual source of truth, not assumed salary rules)

### 4.2 Axis Bank statement import

The supplied file is an Axis Bank “Account Statement Report” for NOVAQORE, account ending 1571, 18 Aug–7 Sep 2026. It contains date, value date, particulars/narration, debit, credit, running balance, cheque number and branch.

Implement a bank-import adapter interface:

```ts
interface StatementParser {
  bankCode: string;
  parse(input: StoredFile): Promise<ParsedStatement>;
}
```

Implement `AxisBankPdfParser` now. It must extract rows robustly despite multi-line narration and page breaks. Support CSV/XLSX upload as the recommended high-accuracy format for future months. Show all parsed rows in a reconciliation UI before any payroll action.

Known statement examples for parser tests:

- Salary-like payments on 01/09/2026, e.g. `.../JEENA ANN JOHN/...` ₹41,467; `.../PRASHANT DHAKED/...` ₹28,967; `.../ZIAUL KADRI/...` ₹113,159.
- Overtime/additional payments appear as separate transfers, e.g. Prashant ₹5,256, Sayan ₹11,942, Afreen ₹8,530.
- Non-salary transactions include a ₹56,327.76 credit-card payment, Hiren ₹55,930, Parth ₹95,620 and CBDT tax ₹76,375.

**Critical rule:** narration/amount matches generate suggested matches only. The system MUST NOT create or issue a salary slip until an authorized user has selected the employee and confirmed the row or grouped set of rows. Separate salary, overtime, reimbursement and cash adjustment lines must be visible and classified explicitly.

## 5. Data model

Create Prisma models/migrations for at least:

- `User`, `Session`, `PasswordResetOtp`, `Role`, `PermissionGrant`
- `Company`, `CompanySequence`, `CompanyTemplate`
- `Employee`, `EmployeeContact`, `EmployeeBankAccount`, `EmployeeSalaryStructure`, `SalaryComponent`
- `BankStatement`, `StatementTransaction`, `StatementMatchSuggestion`, `StatementClassification`
- `PayrollRun`, `PayrollEmployeeLine`, `PayrollEarningLine`, `PayrollDeductionLine`
- `Payslip`, `PayslipVersion`, `DocumentFile`, `DocumentDownloadAudit`
- `TaxFinancialYearConfig`, `EmployeeTaxDeclaration`, `TdsProjection`
- `FinancialCategory`, `FinancialTransaction`, `ProfitReportSnapshot`, `AuditLog`

Use Decimal for all currency. Use an immutable audit record for state changes. Add unique constraints for company employee ID, statement file checksum, payroll period per company, and issued document verification code.

## 6. Payroll and statement workflow

### 6.1 Admin workflow

1. Create/select company and its template version.
2. Create employees and salary structure.
3. Create a payroll run: company + payroll month.
4. Upload statement. Save original document private; compute checksum; enqueue parser.
5. Present parsing status and reconciliation table.
6. User classifies every relevant debit as salary, overtime, reimbursement, tax, expense, loan/EMI, owner transfer or ignore.
7. System suggests employee matches based on normalized beneficiary name, account last four digits, expected monthly pay, transaction date and prior approved mapping.
8. User can group multiple payments for one employee/month (for example salary + overtime) and can record a non-bank cash component without treating it as statement proof.
9. User previews computed payslip values against salary structure, manually enters/approves attendance and approved deductions.
10. User clicks “Approve payroll line”, then “Issue selected payslips”. Require confirmation count + month + company.
11. Worker generates PDF, encrypts/stores it, hashes/signs it, and marks it `ISSUED`.
12. Email employee a notification without sensitive salary information; employee downloads after login.

States:

`DRAFT → PARSING → RECONCILIATION_REQUIRED → READY_FOR_REVIEW → APPROVED → ISSUING → ISSUED`

Allow `FAILED`, `CANCELLED`, and `SUPERSEDED`. Issued documents cannot be edited/deleted; correction produces an explicit new version with reason and audit record.

### 6.2 Matching algorithm

Create a deterministic score and an explainable breakdown:

- normalized beneficiary name similarity: 0–55
- exact account-last-4 match: 0–20
- expected net pay/known salary comparison: 0–15
- prior approved mapping: 0–10

Suggest only; auto-select only at a configurable high threshold and still require payroll approval. Any collision or score below threshold is `NEEDS_REVIEW`.

## 7. Payslip integrity and storage

- PDFs rendered only on server. Employees never receive an editable source file.
- Store original template, source upload, generated PDF and JSON calculation snapshot separately in private object storage.
- Encrypt at rest using storage provider; use KMS-managed encryption when available.
- Generate SHA-256 hash for final PDF and store it with template version/calculation snapshot.
- Add a public verification page that accepts the verification code/QR and returns only validity, company name, payroll period, issue date and document hash prefix—never salary amount or employee bank details.
- Use short-lived signed download URL after authorization; write a download audit event.
- Optional PDF open password is a configurable second layer. Do not claim a PDF is unmodifiable solely because it is password protected.

## 8. TDS and profit module

### 8.1 TDS

Build a configurable calculation engine, not hard-coded 2026 tax slabs.

- Financial-year tax configuration stored by admin/CA
- Old/new regime selection per employee
- Monthly projected annual taxable income
- Components: basic, HRA, allowances, bonus, reimbursements, PF, PT, insurance and configurable deduction types
- Employee declarations/proofs and approval state
- Monthly TDS scheduled/deducted/remaining views
- TDS calculator with clear assumptions, selected financial year and disclaimer: “Estimate only; have a qualified CA review statutory deductions and Form 16.”
- Export data structured for CA/Form 16 preparation; do not claim statutory filing integration in v1.

### 8.2 Profit reporting

Create a separate finance classification section. Never label bank balance as profit.

Classify statements into:

- Revenue/incoming credits
- Salary
- Overtime
- Contractor/business expense
- TDS/CBDT tax
- PF/ESI/other payroll liability
- Loan/EMI
- Credit-card payment
- Owner transfer/drawings
- Cash withdrawal
- Unclassified

Default business-profit treatment for this user’s current reporting:

- Business expenses include salaries, overtime, Hiren, Parth, Hardik cash salary and CBDT.
- Home loan, Bajaj EMI and credit-card payment are reported separately from earned profit.
- Love/Shivani transfers are excluded from earned profit.

These must be editable company policy rules with clear audit history—not permanent code assumptions.

Show per company/month:

`Revenue – business expenses = earned operating profit`

Then separately:

`Earned operating profit – owner/financing/personal outgoings = cash remaining after selected outgoings`

## 9. Frontend and routes

Create a professional responsive public website at `/` with product explanation, security overview and Login CTA. No public payroll data.

Authenticated routes:

| Route | Access |
|---|---|
| `/login`, `/forgot-password`, `/reset-password` | Public |
| `/verify-document` | Public, minimal result |
| `/admin/dashboard` | Super Admin/authorized manager |
| `/admin/companies` | Super Admin |
| `/admin/companies/[companyId]` | Scoped admin/manager |
| `/admin/employees` | Scoped permission |
| `/admin/templates` | Scoped permission |
| `/admin/statements` | Scoped permission |
| `/admin/payroll` | Scoped permission |
| `/admin/payslips` | Scoped permission |
| `/admin/tds` | Scoped permission |
| `/admin/finance` | Scoped permission |
| `/admin/users-permissions` | Super Admin |
| `/admin/audit-logs` | Super Admin |
| `/employee/dashboard` | Employee |
| `/employee/payslips` | Employee, own records |

Use clear dashboards:

- Admin: processing status, unmatched payments, slips waiting approval, TDS due, company profit/cash separation.
- Operations manager: only granted modules/companies; no security/tenant leakage.
- Employee: profile, payslip cards by period, secure download, document status; no edit controls for payroll data.

## 10. API contract and security

Use validated server actions/API routes with Zod schemas. Build REST-style endpoints or typed route handlers with explicit resource authorization. For every endpoint, verify:

1. authenticated user;
2. role/module/action permission;
3. company scope;
4. resource ownership.

Implement:

- MIME/type and size checks for PDF/DOCX/XLSX/CSV uploads
- malware scanning integration point; block unsafe documents
- file checksum/deduplication
- rate limiting for login, OTP, document download and upload
- structured error messages with no financial/employee data leakage
- CSP, security headers, HTTPS-only cookies, CSRF protection
- secrets only via environment variables
- append-only audit logs for authentication, employee changes, role changes, statement uploads, match overrides, payroll approval, issue/correction/download

## 11. Required environment variables

Create `.env.example` only—never commit real values:

```env
DATABASE_URL=
DIRECT_URL=
REDIS_URL=
AUTH_SECRET=
APP_URL=
S3_ENDPOINT=
S3_REGION=
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
EMAIL_PROVIDER=
EMAIL_API_KEY=
EMAIL_FROM=
PDF_SIGNING_PRIVATE_KEY=
PDF_SIGNING_CERTIFICATE=
OTP_PEPPER=
```

Add a Railway deployment guide with web/worker start commands, migrations, environment variables, health endpoint, database backups and private storage CORS settings.

## 12. Tests and acceptance tests

Write automated tests for:

- company scoping: manager from Nova Qore cannot access Nova Workforce records;
- employee can access only own payslip;
- blocked employee cannot log in or download;
- reset OTP expiry, reuse and rate limit;
- employee ID sequence;
- Axis PDF multi-line narration parsing;
- matching suggestions for Jeena/Prashant/Sayan and rejection of non-salary rows;
- a statement upload does not issue a payslip;
- payroll requires review/approval before issuing;
- figures + template fields are included in a generated single-page A4 PDF;
- issue creates hash/version/download audit;
- correction preserves original issued payslip;
- profit view keeps credit-card/home-loan/owner transfers separate from earned operating profit;
- TDS calculator is driven by FY config.

Run lint, typecheck, unit tests, Prisma migration verification and critical Playwright flows before considering this complete.

## 13. Build order

Implement in exactly this order:

1. Scaffold, database, auth, RBAC/company scoping and audit log.
2. Company/employee CRUD and employee portal.
3. Salary structures, template versioning and manual payroll PDF generation.
4. Statement upload/storage/job queue and Axis parser.
5. Reconciliation/matching, approval and automatic issue workflow.
6. TDS calculation/configuration and finance/profit classification.
7. Public marketing/login website, polish, tests, Railway deployment guide.

At the end of each phase, update `IMPLEMENTATION_STATUS.md` with completed files, commands run, known constraints and the next precise task.

## 14. Explicit out-of-scope boundaries for v1

- Do not automatically file TDS returns or generate legally filed Form 16 without CA validation.
- Do not automatically infer salary components solely from a net bank transfer.
- Do not allow an employee to edit an issued PDF.
- Do not use local disk as durable file storage in Railway.
- Do not build a general accounting system; focus on statement classification, payroll reconciliation and clear profit/cash reporting.

## Final handoff requirements

Return:

1. a working local application;
2. Prisma schema/migrations and seed instructions;
3. `.env.example`;
4. Railway deployment guide;
5. test evidence and exact commands;
6. `IMPLEMENTATION_STATUS.md`;
7. a concise list of items that require the Super Admin/CA to configure before using real payroll.


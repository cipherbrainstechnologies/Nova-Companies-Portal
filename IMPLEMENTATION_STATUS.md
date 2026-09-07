# Nova Companies Portal — Implementation Status

## Phase checklist

| Phase | Status | Notes |
|------|--------|-------|
| 1. Scaffold, DB, auth, RBAC, audit | Complete | Next.js 15, Prisma, sessions, OTP, deny-by-default permissions, audit log |
| 2. Company/employee CRUD + employee portal | Complete | Facades, ID sequences `PREFIX-0001`, admin + employee routes |
| 3. Salary structures, templates, PDF | Complete | Form IV B HTML template, payroll facade, PDF generator + verify-document |
| 4. Statement upload + Axis parser | Complete | S3 upload, BullMQ parse, Axis PDF/text + CSV/XLSX parsers |
| 5. Reconciliation, matching, issue | Complete | Classification, scoring, confirmation-gated issue, download audit |
| 6. TDS + finance/profit | Complete | FY-config TDS engine; profit policies; never bank-balance-as-profit |
| 7. Marketing, tests, Railway guide | Complete | Public `/`, Vitest, Playwright smoke, `docs/RAILWAY_DEPLOYMENT.md` |
| 8. Premium UI/UX redesign | Complete | Tokens, AppShell, all admin/employee/auth surfaces restyled; logic preserved |

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
npm test                 # 19 tests passed
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
- Company detail “tabs” deep-link to existing module routes rather than in-page tab panels (same capabilities, clearer navigation).

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

Operate locally with `npm run dev` + `npm run worker`, or deploy per `docs/RAILWAY_DEPLOYMENT.md`.

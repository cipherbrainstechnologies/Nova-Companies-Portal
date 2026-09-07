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

## Commands run

```bash
docker compose up -d
cp .env.example .env
npx prisma migrate dev --name init
SEED_DEV=1 npx tsx prisma/seed.ts
npm test                 # 16 tests passed
npm run typecheck        # passed
npm run lint
npm run build
```

## Completed files (high level)

- `prisma/schema.prisma` + migration `20260907174536_init`
- `src/server/auth/*`, `src/server/rbac/*`, `src/server/facades/*`
- `src/server/statements/*`, `src/server/payroll/*`, `src/server/tds/*`, `src/server/finance/*`
- `src/worker/index.ts`, `src/app/api/**`, `src/app/admin/**`, `src/app/employee/**`
- `messages/catalog.json` (en/fr/es), `docs/RAILWAY_DEPLOYMENT.md`, `.env.example`
- `tests/**`, `e2e/smoke.spec.ts`

## Known constraints

- Reference payslip/statement PDFs were not in the repo; parser/PDF tests use fixtures matching the execution-plan examples (Jeena/Prashant/Ziaul amounts; Dheeraj Yadav Aug 2026 figures).
- PDF generation prefers Playwright Chromium; falls back to a minimal PDF writer if browsers are unavailable.
- Object storage requires MinIO/S3 credentials; uploads fail without a reachable bucket.
- Email uses console adapter unless `EMAIL_PROVIDER=resend` + `EMAIL_API_KEY` are set.
- `SEED_DEV=1` only — never seed production.

## Super Admin / CA configuration checklist

Before real payroll:

1. Set production secrets (`AUTH_SECRET`, `OTP_PEPPER`, S3, Redis, DB, email).
2. Update company GSTIN, address, and logo (currently “Needs configuration”).
3. Review/edit active payslip HTML template version per company.
4. Enter FY tax slabs via TDS config (do not rely on demo calculator defaults).
5. Confirm profit policy rules (Hiren/Parth/Hardik/CBDT/Love/Shivani/CC/loan patterns).
6. Create Operations Manager users and explicit `PermissionGrant` rows.
7. Install Playwright Chromium on the worker image for production PDF quality.
8. Have a CA review TDS estimates and Form 16 exports — v1 does not file returns.

## Next precise task

Operate locally with `npm run dev` + `npm run worker`, or deploy per `docs/RAILWAY_DEPLOYMENT.md`.

# Sprint 0 — Repository audit report

**Date:** 2026-10-10  
**Branch audited:** `cursor/eor-full-implementation-bb34`  
**Repository:** Nova-Companies-Portal  

## Stack verification

| Layer | Finding |
|-------|---------|
| Next.js 15 App Router | Confirmed (`package.json`, `src/app`) |
| Prisma / PostgreSQL | Confirmed (`prisma/schema.prisma`, migrations) |
| Sessions + RBAC | `src/server/auth`, `src/server/rbac/permissions.ts` |
| Redis / BullMQ worker | `src/worker`, `src/server/queue` |
| S3 private storage | `src/server/storage/s3.ts` |
| Payroll / finance | Unchanged facades under `src/server/payroll`, `src/server/finance` |
| Vitest / Playwright | `tests/*`, `e2e/*` |

## Security P0 — exposed credentials

| Action | Status |
|--------|--------|
| Remove passwords from public README | Done |
| Refuse `SEED_DEV` in `NODE_ENV=production` | Done (`prisma/seed.ts`) |
| Rotate production credentials | **Operator action** — run `docs/eor/CREDENTIAL_ROTATION_RUNBOOK.md` |
| Review access logs | **Operator action** |

## Architectural decision

`Company` = NOVA legal employer; `ClientOrganization` = overseas customer. Documented in `docs/eor/ENTITY_BOUNDARIES.md`.

## Regression evidence

```bash
npm run typecheck
npm test
npm run build
```

## Gaps before production client pilot

- Configure `SIGNATURE_WEBHOOK_SECRET` for e-sign provider
- Complete legal template register with counsel-approved PDFs
- Run `e2e/client-eor.spec.ts` against staging with seeded tenants

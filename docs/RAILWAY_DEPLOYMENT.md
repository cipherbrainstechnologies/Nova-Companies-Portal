# Railway Deployment Guide — Nova Salary Portal

The repo is self-contained for Railway. Infrastructure is declared in [`.railway/railway.ts`](../.railway/railway.ts). The root [`Dockerfile`](../Dockerfile) builds one image used by both **web** and **worker** (Playwright Chromium included for payslip PDFs).

## One-time setup

```bash
npm install
npm i -g @railway/cli   # v5.49+ recommended
railway login
railway init            # create or link a project
railway config apply    # creates postgres, redis, bucket, web, worker
```

Then in Railway → Variables (shared, or on both **web** and **worker**):

| Variable | Required | Notes |
|---|---|---|
| `AUTH_SECRET` | yes | 32+ random characters |
| `OTP_PEPPER` | yes | random string |
| `APP_URL` | recommended | `https://<web-domain>`; falls back to `RAILWAY_PUBLIC_DOMAIN` if unset |
| `EMAIL_API_KEY` | for real email | Keep `EMAIL_PROVIDER=console` until Resend (or other) is ready |
| `EMAIL_PROVIDER` | optional | Default in IaC is `console`; set `resend` when ready |
| `EMAIL_FROM` | optional | Default set in IaC |

Generate a public domain on the **web** service. Do **not** set `SEED_DEV=1` in production.

## What Railway provisions

| Resource | Purpose |
|---|---|
| **postgres** | Prisma / app data (`DATABASE_URL`, also used as `DIRECT_URL`) |
| **redis** | BullMQ (`REDIS_URL`) |
| **payslip-files** | Private object storage → `S3_ENDPOINT`, `S3_BUCKET`, keys, region |
| **web** | `npm run start` · health `/api/health` · `preDeploy`: `npx prisma migrate deploy` |
| **worker** | `npm run worker` · statement parse, payslip PDF, email queues |

Object storage stays on Railway Buckets (S3-compatible). Do not store blobs in Postgres or on local disk.

## Build image

The Dockerfile:

1. `npm ci`
2. `prisma generate` + `next build`
3. `playwright install --with-deps chromium`
4. Ships app + browsers; default CMD is web; worker overrides start command

## Health check

`GET /api/health` → `{ status: "ok" }` when the database is reachable.

## Email / PDF signing

- Email defaults to console logging until `EMAIL_PROVIDER` + `EMAIL_API_KEY` are set.
- Optional: `PDF_SIGNING_PRIVATE_KEY`, `PDF_SIGNING_CERTIFICATE`.
- Optional: `MATCH_AUTO_SELECT_THRESHOLD` (default `85`).

## Backups

- Enable Railway PostgreSQL automated backups / snapshots.
- Payslip files live in the Railway bucket — treat bucket retention as part of backup policy.
- Audit logs are append-only in Postgres — include them in DB backups.

## Local development (unchanged)

```bash
docker compose up -d
cp .env.example .env
npm install
npx prisma migrate dev
SEED_DEV=1 npx prisma db seed
npm run dev
npm run worker
```

See also [`.railway/README.md`](../.railway/README.md) and [CONFIGURATION_CHECKLIST.md](./CONFIGURATION_CHECKLIST.md).

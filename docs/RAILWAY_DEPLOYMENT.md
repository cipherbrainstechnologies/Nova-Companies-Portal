# Railway Deployment Guide — Nova Salary Portal

## Services

Create four Railway resources:

| Service | Start command | Notes |
|---|---|---|
| **web** | `npm run start` | After `npm run build`. Expose public HTTPS. |
| **worker** | `npm run worker` | Same image/repo; no public port required. |
| **PostgreSQL** | Railway plugin | Set `DATABASE_URL` and `DIRECT_URL`. |
| **Redis** | Railway plugin | Set `REDIS_URL`. |

Private object storage (Cloudflare R2 or AWS S3) is external. Never store file blobs in Postgres. Never use local disk as durable storage on Railway.

## Build & migrate

```bash
npm ci
npx prisma migrate deploy
npm run build
```

Release phase / deploy hook recommendation:

```bash
npx prisma migrate deploy
```

## Environment variables

Copy from `.env.example`. Required in production:

- `DATABASE_URL`, `DIRECT_URL`
- `REDIS_URL`
- `AUTH_SECRET` (32+ chars)
- `APP_URL` (public Railway URL)
- `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`
- `EMAIL_PROVIDER`, `EMAIL_API_KEY`, `EMAIL_FROM`
- `OTP_PEPPER`
- Optional: `PDF_SIGNING_PRIVATE_KEY`, `PDF_SIGNING_CERTIFICATE`, `MATCH_AUTO_SELECT_THRESHOLD`

`SEED_DEV` must remain unset/`0` in production.

## Health check

`GET /api/health` — returns `{ status: "ok" }` when the database is reachable.

Configure Railway health check path: `/api/health`.

## Worker

The worker consumes BullMQ queues:

- `statement-parse`
- `payslip-generate`
- `email-notify`

Run Playwright Chromium dependencies on the worker image if using Playwright PDF rendering:

```bash
npx playwright install chromium
```

## Object storage CORS

Allow the web origin (`APP_URL`) only if browser-side uploads are enabled. Preferred path is server-side upload via API (no public bucket ACL). Keep the bucket private; downloads use short-lived signed URLs.

## Backups

- Enable Railway PostgreSQL automated backups / snapshots.
- Enable object-storage versioning on the payslip bucket.
- Audit logs are append-only in Postgres — include them in DB backups.

## Local development

```bash
docker compose up -d
cp .env.example .env
npx prisma migrate dev
SEED_DEV=1 npx prisma db seed
npm run dev
npm run worker
```

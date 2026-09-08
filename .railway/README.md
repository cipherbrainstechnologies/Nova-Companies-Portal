# Railway Infrastructure as Code

This folder defines the Nova Salary Portal stack for [Railway](https://railway.com).

## What it creates

| Resource | Role |
|---|---|
| `postgres` | Primary database (`DATABASE_URL` / `DIRECT_URL`) |
| `redis` | BullMQ broker (`REDIS_URL`) |
| `payslip-files` | Private S3-compatible bucket (wired to `S3_*`) |
| `web` | Next.js app — public HTTPS, health check `/api/health`, Prisma migrate on deploy |
| `worker` | Same image — BullMQ worker + Playwright Chromium for payslip PDFs |

## Deploy (first time)

1. Push this repo to GitHub (already: `cipherbrainstechnologies/Nova-Companies-Portal`).
2. Install CLI: `npm i -g @railway/cli` (v5.49+ recommended).
3. From the repo root:

```bash
npm install
railway login
railway init          # create / link a Railway project
railway config apply  # review the plan, then confirm
```

4. In the Railway dashboard (Variables), set once for **web** and **worker** (or as shared variables):

| Variable | Notes |
|---|---|
| `AUTH_SECRET` | 32+ random chars |
| `OTP_PEPPER` | random string |
| `APP_URL` | `https://<your-web-service>.up.railway.app` (copy from web service domain) |
| `EMAIL_API_KEY` | optional until you switch `EMAIL_PROVIDER` to `resend` |

5. Generate a public domain on the **web** service if Railway did not attach one automatically.
6. Wait for the first deploy. Migrations run via `preDeploy` on **web**.

## Subsequent deploys

Pushes to `main` rebuild **web** and **worker** from the root `Dockerfile`. Re-run `railway config apply` only when you change `.railway/railway.ts`.

# Nova Salary Portal

Multi-company salary slip delivery and finance reconciliation portal for Nova Workforce / Nova Qore (Railway-ready).

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind · PostgreSQL + Prisma · Redis + BullMQ · S3-compatible storage · Vitest + Playwright

## Quick start

```bash
docker compose up -d
cp .env.example .env
npm install
npx prisma migrate dev
SEED_DEV=1 npx tsx prisma/seed.ts
npm run dev
# separate terminal
npm run worker
```

Dev credentials (after `SEED_DEV=1` seed):

| Portal | Login | Password |
|---|---|---|
| Admin | `thenovaworkforce@gmail.com` | `Swrit#1311` |
| Employee | `NW-0020` | `DemoEmp#1311` |

Use `/login/admin` and `/login/employee` (chooser at `/login`).

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Web app |
| `npm run worker` | BullMQ worker |
| `npm test` | Unit tests |
| `npm run typecheck` | TypeScript |
| `npm run build` | Production build |
| `npm run test:e2e` | Playwright smoke (app must be running) |

## Docs

- [Railway deployment](docs/RAILWAY_DEPLOYMENT.md) — connect repo + `railway config apply`
- [Railway IaC](.railway/README.md) — postgres, redis, bucket, web, worker
- [Configuration checklist](docs/CONFIGURATION_CHECKLIST.md)
- [Implementation status](IMPLEMENTATION_STATUS.md)
- [Execution plan](cursor-salary-portal-execution-plan.md)

# API contracts (EOR)

## Client (tenant-scoped)

- `POST /api/client/[clientSlug]/hire-requests` — submit hire (requires `team:CREATE`, active client for CLIENT_USER)
- Additional read APIs are server-rendered in App Router pages for v1.

## NOVA admin

- `GET/POST /api/admin/clients` — list/create prospects
- `GET/PATCH /api/admin/clients/[clientId]` — detail, lifecycle, entity proposal
- `POST /api/admin/clients/[clientId]/kyb` — compliance decision
- `POST /api/admin/clients/[clientId]/pricing` — versioned pricing
- `POST /api/admin/clients/[clientId]/agreements` — agreement shell / manual sign evidence
- `POST /api/admin/clients/[clientId]/assignments` — employment assignment backfill

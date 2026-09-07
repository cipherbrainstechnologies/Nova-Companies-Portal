# UI Redesign Audit — Nova Companies Portal

**Date:** 2026-09-08  
**Scope:** Frontend-only visual system and presentation redesign. Business logic, APIs, schema, RBAC, and document flows are preserved.

## Stack & entry points

| Layer | Location | Preserve |
|-------|----------|----------|
| Next.js 15 App Router | `src/app/**` | Routes and page data loaders |
| Auth / sessions | `src/server/auth/**`, `/api/auth/**` | Unchanged |
| RBAC | `src/server/rbac/**`, `requirePageUser` | Unchanged |
| Payroll / statements / TDS / profit | `src/server/**` + `/api/**` | Unchanged |
| i18n | `messages/catalog.json`, `src/i18n` | Keys reused; industrial copy tone softened in UI |
| Prior UI system | Desert Rose + Swiss Industrial Print | **Replaced** by premium SaaS tokens |

## Route map (preserved)

### Public / auth
| Route | Purpose |
|-------|---------|
| `/` | Marketing landing |
| `/login` | Portal chooser (admin vs employee) |
| `/login/admin` | Admin gate — email/phone + password |
| `/login/employee` | Employee gate — employee code/phone + password |
| `/forgot-password` | OTP request via phone + email target |
| `/reset-password` | OTP + new password |
| `/change-password` | Forced password rotation |
| `/verify-document` | Public payslip verification (no salary data) |

### Admin (`SUPER_ADMIN` / `OPERATIONS_MANAGER`; users page = Super Admin only)
| Route | Purpose |
|-------|---------|
| `/admin/dashboard` | Ops telemetry |
| `/admin/companies`, `/admin/companies/[companyId]` | Company registry |
| `/admin/employees` | Roster + create (`?companyId=`) |
| `/admin/templates` | Payslip HTML template versions |
| `/admin/statements` | Upload + reconciliation panel |
| `/admin/payroll` | Create run + list runs |
| `/admin/payslips` | Folder-tree browser + secured download |
| `/admin/tds` | Projection calculator + disclaimer |
| `/admin/finance` | Profit engine UI (never bank-balance-as-profit) |
| `/admin/users-permissions` | User + grant listing |
| `/admin/audit-logs` | Append-only audit |

### Employee (`EMPLOYEE`)
| Route | Purpose |
|-------|---------|
| `/employee/dashboard` | Profile summary |
| `/employee/payslips` | Issued slips folder + download API |

## Shared UI (before → after)

| Before | After |
|--------|--------|
| `HazardBar`, hard 2px borders, uppercase mono meta | Soft shell, 8px spacing, sentence case |
| `AdminShell` flat sidebar | Desktop sidebar + mobile drawer + top header + profile/logout |
| `PublicChrome` industrial frame | Minimal auth/marketing chrome |
| `StatCell` / `DataRow` / `CompanyTabs` | Restyled premium equivalents (same exports) |
| `Button` / `Input` / `Card` zero-radius | Soft radius, focus rings, calm status colours |

## Role behaviour preserved

- Separate admin vs employee login portals (existing API `portal` field).
- Super Admin-only: create company, users-permissions, audit-logs.
- Operations Manager: scoped company modules via existing grants (UI does not invent actions).
- Employees: dashboard + issued payslips only; download via `/api/payslips/[id]/download`.
- Logout: `POST /api/auth/logout` → `/login`.

## Explicit non-goals

- No Prisma schema changes
- No payroll calculation, matching, issue confirmation, or PDF pipeline changes
- No mock data on production paths
- No new permission matrix editor (presentation only; grants remain as listed)

## Redesign sequence

1. Tokens + primitives (`globals.css`, `ui.tsx`, `industrial.tsx`, portal helpers)
2. App shells (admin + employee) + auth surfaces
3. Admin operational pages
4. Employee + public verify/marketing
5. Lint, typecheck, unit tests, production build

# NOVA EOR — Architecture

## Entity boundaries

- `Company` — NOVA legal employer (Nova Workforce, Nova Qore, …). Payroll, statements, and payslips remain company-scoped.
- `ClientOrganization` — overseas customer legal person. Never reuse `Company` for clients.
- `EmploymentAssignment` — links `Employee` (NOVA payroll anchor) to `ClientOrganization` with `novaCompanyId` consistency enforced in code.

## Surfaces

| Surface | Path | Audience |
|---|---|---|
| Internal admin | `/admin/*` | SUPER_ADMIN, OPERATIONS_MANAGER |
| Employee | `/employee/*` | EMPLOYEE |
| Client portal | `/client/[slug]/*` | CLIENT_USER memberships |
| Marketing | `/(site)/*` | Public |

## Authorisation

Client routes call `requireClientCapability` — **no** `SUPER_ADMIN` bypass on client mutations. NOVA support may read via `requireClientMembership` impersonation path for break-glass only on reads.

## ADR

Decision #EOR-001 (2026-10-10): Introduced `ClientOrganization` instead of overloading `Company`. Status: Active.

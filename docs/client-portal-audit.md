# Client portal audit — 13 October 2026

The client portal, admin client tools, payroll engine, invoices, and tenant checks already exist. This pass connected the incomplete client onboarding screen and aligned the client shell with the public site. It did not replace payroll, invoicing, or activation rules.

## Implementation matrix

| Module | Current state | Gap | Action taken | Priority |
|---|---|---|---|---|
| Authentication | Login, logout, forgot/reset password, invite accept, HTTP-only session | Client login still uses the shared public chrome | Left in place. Logout remains `POST /api/auth/logout` | P0 |
| Client onboarding | KYB upload worked. Submit button was disabled. Profile and plan were not editable by the client | No resumable company form, no submit transition | Profile, draft plan, and submit to `KYB_REVIEW` added. Repeat submit does not create another case | P0 |
| Client dashboard | Four figures from live queries | No action list, employee list, or approved fee | Dashboard now reads approvals, employees, and the approved pricing agreement | P0 |
| Employee management | Hire request and assignment list existed | Few columns, no search, desktop-only table | Search, pagination, role, department, joining date, and mobile cards | P0 |
| Documents | Private KYB upload and employee document storage exist | Client cannot browse every employment file from one screen | Upload categories added. No new document model | P1 |
| Payroll | Admin payroll engine and client payroll page exist | Client must not finalise statutory payroll | Unchanged | P1 |
| HR and leave | `leave-expenses` was a placeholder | No leave ledger | Page now says leave is not accepted here. No fake requests | P1 |
| Compliance | Activation blockers already require KYB approval, employing entity, signed agreement, and pricing | Client cannot self-activate | Unchanged | P1 |
| Billing | Invoices and pricing agreements exist | Draft plan must not become a billed fee | Draft plan is stored on the onboarding checklist only | P1 |
| Reporting | Activity audit exists | No client reporting suite | Unchanged | P2 |

## Not treated as production-ready

- Leave requests, attendance, and offboarding workflows.
- Client-side employment activation.
- Electronic signature. The onboarding page does not offer a signature checkbox.
- A support ticket queue.
- Mapping the published ₹5,000 / ₹7,500 list prices onto `ClientPricingAgreement`. That record is created only when Nova approves it.

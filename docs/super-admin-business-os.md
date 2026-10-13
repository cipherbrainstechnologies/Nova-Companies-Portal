# Super Admin command centre

Verified against the repository on 13 October 2026. Payroll, invoice issuance, pricing agreements, legal execution, and activation gates were not changed. No migration.

## Audit

| Route | Decision | Source | Disposition |
| --- | --- | --- | --- |
| `/admin/dashboard` | How is the EOR book performing, and what is financially urgent? | Clients, assignments, pricing agreements, invoices, funding requests | KEEP, restructured as the command centre |
| `/admin/tasks` | What is the next operational action, and who owns it? | Same read model | KEEP as Operations. Do not add a second queue |
| `/admin/clients` | Which organisations exist, and on which contracted plan? | `ClientOrganization`, effective `ClientPricingAgreement` | KEEP |
| `/admin/clients/[clientId]` | What is true for this client across employment, price, invoices, and legal status? | Existing client workspace plus the read model | KEEP. Header now shows employer, plan, and renewal from records |
| `/admin/workforce` | Who is assigned to a client, and who still needs a classification? | `Employee`, `EmploymentAssignment` | KEEP. Unassigned people are not labelled Nova staff |
| `/admin/employees` and company employee profiles | Maintain the canonical employee, salary, and documents | `Employee` and salary versions | KEEP. Salary stays off the command centre |
| `/admin/finance`, statements, payroll, payslips | Company bank profit and payroll operations | Statement and payroll models | KEEP. This is not EOR service revenue |
| `/admin/legal-templates` | Which agreement text can be sent for signature? | `LegalTemplate` | KEEP |
| `/admin/companies`, templates, users, audit | Administer Nova entities and access | Company, user, audit log | KEEP under Administration |
| Reports, reminder calendar, finance command centre as separate products | — | Not enough source data for a second dashboard | Do not add empty routes |

Page access is still `requirePageUser(["SUPER_ADMIN", "OPERATIONS_MANAGER"])`. That is not a full capability matrix. Client portal access still requires `ACTIVE`.

## Metric dictionary

Definitions rendered on the dashboard live in `METRIC_DEFINITIONS`.

| Figure | Basis | Never includes |
| --- | --- | --- |
| Contracted EOR fees | Effective pricing agreement × distinct active employees on ACTIVE clients, in the agreement currency | Salary, catalogue price where no agreement exists, other currencies converted into INR |
| Invoiced service fees | Posted invoice lines classified as the platform fee, by invoice period | Employment-cost lines, drafts, voids |
| Posted billings | Posted invoice total for the selected month | Draft, forecast, finance-approved, and voided invoices |
| Overdue receivables | Posted total minus payments minus credit notes, when the balance is positive and the due date is before the as-of date | Not-yet-due balances, which stay in outstanding |
| Payroll funding requested | Open `PayrollFundingRequest` amounts | Cleared cash. Coverage stays Unavailable |
| FX variance | Count of settlements only | Any summed amount. `varianceAmount` has no currency |

Historical contracted fees use the agreement effective on the as-of instant, not today's catalogue and not a later version.

## Data gaps

1. No client-level operating costs, so contribution margin stays Unavailable.
2. No cleared-funds balance, so funding coverage stays Unavailable.
3. `FXSettlement.varianceAmount` has no currency. Amounts are not labelled INR.
4. `Employee` has no internal-staff flag. Unassigned active employees are "needs classification".
5. Client lifecycle history is not effective-dated, so a headcount trend is not shown.
6. No reminder table, scheduler deduplication, or escalation policy.
7. Invoice revenue and earned revenue cannot be distinguished. The screen says invoice-based or contracted run-rate.

## This change

The command centre leads with six decisions. `/admin/finance/eor` is the receivables workspace. It ages open invoices as of the reporting date, lists payroll funding requests without calling them cleared cash, and shows FX settlements with INR received separated from an unverified variance amount.

Company bank profit remains on `/admin/finance`.

## Still later

Reminder engine, approval workflows for salary and custom pricing, capability-based roles, paginated exports, and an explicit internal-staff field. That field should default existing rows to unclassified, with an audit record when someone confirms Nova employment. It should not be backfilled from the absence of an assignment.

## Tests

`tests/business-metrics.test.ts` covers the fee/reimbursement split, effective-dated pricing, overdue balances, unverified FX, overlapping assignments, and unclassified employees.

## Verification limit

The signed-in screens were not rechecked in a browser. Local Postgres was not running during the previous check, and this change does not start it.

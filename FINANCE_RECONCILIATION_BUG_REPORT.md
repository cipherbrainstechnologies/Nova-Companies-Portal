# Finance Reconciliation Bug Report

**Date:** 2026-09-08  
**Company / period under diagnosis:** Nova Workforce · April 2025  
**Statement under test:** `upload/WORKFORCE-1.PDF` (checksum `fa13c28548fb…`, Axis Account Statement Report 01/04/2025–31/03/2026)

## Pipeline traced

```text
PDF parser
→ parsed transaction rows
→ transaction direction and amount
→ persisted statement transactions
→ company assignment
→ selected month date filter
→ classification rules
→ profit reconciliation service
→ finance API response
→ frontend rendering
```

## Diagnostic counts (April 2025, from WORKFORCE-1.PDF text extract)

| Metric | Value |
| --- | ---: |
| Parsed April 2025 transaction count | **15** |
| Persisted April 2025 transaction count (after successful parse) | **15** (same rows; was **0** while worker/parser failed) |
| Credit transaction count | **1** |
| Credit total | **₹11,71,876.27** |
| Debit transaction count | **14** |
| Debit total | **₹8,89,659.00** |
| Classified as Revenue (post-fix) | **1** (Sana Life Science) |
| Classified as Bank-paid salary | **11** (NEFT/EB/… including SUTHAR HARDIKKUMAR) |
| Classified as Overtime | **0** |
| Classified as Hardik cash salary | **1** (`MOB/TPFT/LOVE N CHAUHAN…` ₹1,00,000) |
| Classified as CBDT / business tax | **1** (`INTERNET TAX PAYMENT` ₹42,683) |
| Classified as Personal / owner transfer | **0** in April after Hardik-cash override |
| Left unclassified / needs review | **1** (Ahmedabad Municipal Corporation ₹2,211) |

### Expected API shape (Nova Workforce · 2025-04)

```json
{
  "company": "Nova Workforce",
  "period": "2025-04",
  "revenue": 1171876.27,
  "bankPaidSalaries": 744765.0,
  "overtime": 0,
  "salaryRelatedCashPayments": 100000.0,
  "cbdtBusinessTax": 42683.0,
  "earnedOperatingProfit": 284428.27,
  "reconciliationStatus": "PARTIAL_REVIEW_REQUIRED"
}
```

## Exact root cause of Revenue appearing as ₹0.00

**Primary cause (classification / policy):**  
The original default profit policy rules did **not** include a `SANA LIFE SCIENCE` revenue narration rule. In `summarizeEarnedProfit` / the legacy engine:

1. Unmatched **credits** were skipped (`continue`) so they never entered `revenue`.
2. Some unmatched / loosely matched **debits** still entered business expense buckets.

So April could show:

```text
Revenue: ₹0.00
Expenses: > 0
Earned operating profit: negative
```

even though the PDF correctly contained the Sana Life Science credit.

**Contributing causes:**

1. **Bare `HARDIK` rule** matched employee narration `SUTHAR HARDIKKUMAR` (₹91,467) as cash-salary / business expense instead of bank-paid salary. Together with the Feb-salary SOLANKI line (₹23,020) this produces **₹1,14,487** — matching the “Other business expenses” figure reported on the Finance screen.
2. **`INTERNET TAX PAYMENT`** was not mapped to CBDT/tax (only `CBDT|TDS`).
3. **`LOVE N CHAUHAN` Hardik cash salary** was caught by the generic Love owner-transfer rule instead of an approved cash-salary rule.
4. **Employee NEFT/EB/** payouts often lack the word `SALARY`; without a `NEFT/EB/` salary rule they stayed out of the salary bucket.
5. **Stale `ProfitReportSnapshot` rows** kept collective cards at revenue ₹0 / large negatives after imports or rule changes.
6. Earlier **Axis Account Statement Report** rows (S.NO-prefixed) failed to parse at all → 0 persisted rows until the Axis parser fix; Finance then computed over incomplete months.

**Not the root cause:** Frontend-only formatting. The API/engine was capable of emitting revenue ₹0 when credits were unclassified and skipped.

## Correction applied

| Area | Fix |
| --- | --- |
| Axis PDF direction | Report layout with S.NO; debit/credit via balance delta; Sana is credit |
| NW policy | Direction-aware rules: Sana/Skydotec **credit-only**; `NEFT/EB/` salaries; overtime; approved Love→Hardik cash; `INTERNET TAX`→CBDT; no bare `HARDIK` |
| FinanceTreatment | `REVENUE \| SALARY \| OVERTIME \| SALARY_RELATED_CASH \| CBDT_BUSINESS_TAX \| OTHER_BUSINESS_EXPENSE \| PERSONAL_FINANCING \| OWNER_TRANSFER \| UNCLASSIFIED \| IGNORE` |
| Earned profit | Unclassified never alters earned profit |
| Snapshots | Invalidate on statement parse + manual classify; Finance **Recompute** action; MoM growth suppressed when incomplete / prior month is 0 |
| UI | Separate earned / personal / cash remaining / unclassified sections |

## Files changed

- `src/server/statements/axis-bank-pdf-parser.ts` (prior Axis report fix)
- `src/server/finance/profit-categories.ts`
- `src/server/finance/profit-policy-defaults.ts`
- `src/server/finance/profit-engine.ts`
- `src/server/statements/statement-service.ts` (snapshot invalidation)
- `src/app/api/finance/profit/route.ts`
- `src/app/api/finance/profit/recompute/route.ts`
- `src/app/api/finance/profit-policies/route.ts`
- `src/app/admin/finance/page.tsx`
- `src/app/admin/finance/profit-form.tsx`
- `src/app/admin/finance/recompute-button.tsx`
- `prisma/schema.prisma` + `prisma/migrations/20260908190000_profit_policy_direction`
- `tests/profit-engine.test.ts`
- `tests/workforce-april-2025-pdf.test.ts`
- `tests/fixtures/axis-account-statement-report.txt`
- `upload/WORKFORCE-1.PDF`, `upload/WORKFORCE-2.PDF`
- `memory-bank/architecture.md`
- `IMPLEMENTATION_STATUS.md`
- `FINANCE_RECONCILIATION_BUG_REPORT.md` (this file)

## Tests run

```text
npx vitest run tests/profit-engine.test.ts tests/axis-parser.test.ts tests/workforce-april-2025-pdf.test.ts
```

April 2025 fixture asserts earned operating profit **₹2,84,428.27** with revenue **₹11,71,876.27**.

## Remaining manual classifications before “fully reconciled”

April 2025 Nova Workforce still returns `PARTIAL_REVIEW_REQUIRED` until:

1. **Ahmedabad Municipal Corporation ₹2,211** — confirm as business tax/charge or leave unclassified (must not enter earned profit silently).
2. Confirm **MOB/TPFT/LOVE N CHAUHAN ₹1,00,000** remains approved as Hardik cash salary for every future month (or replace with a locked manual classification).
3. After deploy: **Recompute all profit snapshots**, re-seed NW/NQ profit policies (`SEED_DEV=1` or policy editor sync), and **Parse now** on any statement still at 0 rows.
4. Import **WORKFORCE-2.PDF** (01/04/2026–08/09/2026) and review each month’s unclassified list before marking MoM growth available.

## Validation checklist

- [x] April 2025 revenue is no longer ₹0.00 in the fixture/engine  
- [x] April 2025 earned operating profit = ₹2,84,428.27 in automated tests  
- [x] Revenue / salary / cash-salary / CBDT / personal / unclassified separated  
- [x] Aggregate cards ignore empty months and support recompute  
- [x] MoM growth suppressed when reconciliation incomplete or prior earned = 0  
- [x] Parser + classification + calculation tests added  

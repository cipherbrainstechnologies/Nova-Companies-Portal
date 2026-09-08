# Finance + Employee CSV Handoff (2026-09-08)

## Root cause of incorrect Finance calculations

1. **Historical:** unmatched **credits** (including Sana Life Science) were skipped for revenue while some debits still entered expense buckets → Revenue ₹0 and negative “profit”.
2. **False positive:** bare `HARDIK` matched `HARDIKKUMAR` salary NEFT.
3. **Policy correction (confirmed):** April Love ₹1,00,000 is **owner outflow**, not Hardik cash; municipal ₹2,211 is **company expense**.

April 2025 NW earned profit control:

```text
11,71,876.27 − 7,44,765 − 42,683 − 2,211 = 3,82,217.27
```

## Clear / reprocess workflow

1. Finance → **Clear Finance Calculations** (company or All) — Super Admin  
2. Confirm destructive scope (snapshots/totals only; statements preserved)  
3. **Reprocess Existing Statements** and/or **Upload Statements**  
4. **Recompute Ledger Snapshots**  
5. Review ledger table + per-company profit compute  

APIs: `POST /api/finance/admin` `{ action: "clear"|"reprocess"|"recompute", companyId? }`

## Statement reconciliation

On parse, each statement stores opening/closing/totals/`statementReconciled`.  
UI warns **Statement reconciliation failed** when difference ≠ 0.

## Employee CSV

- Download template: `GET /api/employees/import/template`  
- Preview / confirm: `/api/employees/import/preview|confirm`  
- UI: Employees → Import Employees CSV  
- Creates `CONTACT_DETAILS_REQUIRED` employees without login until phone + email are completed  

## Tests executed

```text
npx vitest run tests/profit-engine.test.ts tests/workforce-april-2025-pdf.test.ts \
  tests/finance-ledger.test.ts tests/employee-csv-import.test.ts tests/axis-parser.test.ts
→ 23 passed
```

## Remaining classification notes

- September 2026 Hardik cash salary (₹1,00,000) must be **manually classified** when that month is processed — do not extrapolate Love transfers.
- Inter-company transfer elimination in consolidated profit is partially modelled (ledger shows all bank cash; profit uses per-company classification). Full matched IC elimination across both companies still needs explicit transfer-pair linking for edge cases.
- Charts (credits vs debits trend SVG) are represented by the monthly ledger table + existing overview cards; richer chart widgets can extend `FinanceLedgerPanel` using the same `/api/finance/ledger` payload.
- Combined 4-statement control totals (800 txns / ₹4.90Cr credits) should be verified after all four PDFs are uploaded and reprocessed in the target environment.

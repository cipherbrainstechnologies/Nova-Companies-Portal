# Configuration checklist (Super Admin / CA)

Items that must be configured before using real payroll data:

1. **Secrets** — `AUTH_SECRET`, `OTP_PEPPER`, database, Redis, S3/R2, email API key.
2. **Company profile** — legal name, GSTIN, address, logo (replace “Needs configuration”).
3. **Payslip template** — review Form IV B HTML/CSS version per company; publish a new version for changes.
4. **Tax FY config** — admin/CA enters slabs and standard deduction for OLD/NEW regimes (engine is config-driven).
5. **Profit policies** — confirm treatment of salaries, OT, Hiren/Parth/Hardik/CBDT, home loan/Bajaj/CC, Love/Shivani transfers.
6. **Managers** — create Operations Managers and grant `companyId + module + action` explicitly.
7. **Worker PDF** — `npx playwright install chromium` on the worker service for production-quality A4 PDFs.
8. **CA review** — TDS projections and Form 16 preparation exports are estimates only; no statutory filing in v1.

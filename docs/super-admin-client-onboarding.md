# Super Admin client onboarding

## Architecture audit

The application already had one client organisation, one onboarding case, KYB review, a manual signature envelope, activation gates, and client invitations. Those records remain the source of truth.

What was missing:

- Client creation captured only a legal name and country.
- No versioned legal-template library and no client-specific document pack.
- Signature status lived only on `SignatureEnvelope`, which requires an agreement and a Nova company.
- A client user with a membership could open the portal before the organisation was active.
- Invitation acceptance did not check that the organisation was active.

Payslip templates, statutory payroll, the estimate API, invoices, and `ClientPricingAgreement` were left unchanged.

## What was added

`LegalTemplate` stores generic draft text, required variables, and the legal-review flags. Version 1 is created as `DRAFT`. Only a Super Admin can approve a version, and only an approved version can move to signature.

`ClientLegalDocument` stores each generated PDF, its checksum, the variable snapshot, and the lifecycle. An executed upload is a second file. A `FULLY_EXECUTED` row is not regenerated. Recording the executed master agreement also writes the existing `NovaEntityClientAgreement`, `AgreementDocument`, and a completed manual `SignatureEnvelope`, which is what activation already checks.

Creating a client with the same legal name and country returns the existing organisation and fills any missing documents. A failed PDF is stored as `GENERATION_FAILED` and the next create or regenerate retries it.

## Activation

`canActivateClient` is unchanged: approved KYB, a proposed Nova company, a completed signature envelope, and an open pricing agreement. Activating sends one expiring invitation to the representative email. The email contains a link, not a password. Accepting the invitation is refused while the organisation is not active. A second acceptance does not reset the password. Client users with a membership still cannot open portal pages until the organisation is `ACTIVE`.

## Migration

`prisma/migrations/20261013140000_client_legal_documents/migration.sql` adds `ClientOrganization.publicReference`, `LegalTemplate`, and `ClientLegalDocument`. Apply it with `npx prisma migrate deploy`.

## External dependencies

- No e-sign provider is integrated. Execution is a verified signed PDF plus signatory name, email, and time.
- Template version 1 is a generic draft. It is not approved for production signature until counsel reviews the flags on Legal templates and a Super Admin approves that version.
- The three reference agreements were not in the repository, so no counterparty, healthcare, or historical fee language was copied.
- PDF rendering uses the existing Playwright path and falls back to a minimal PDF if Chromium is unavailable.
- Email uses the existing provider. Without an API key, the invitation is written to the server log.
- The database must be migrated before the new screens load.

## Production readiness

Not ready for production execution of contracts. The workflow can create a client and a draft pack, and the variable, regeneration, and signature guards are covered by `tests/legal-documents.test.ts`. The UK-client browser path, cross-tenant download, and invitation email were not exercised because they need a migrated database, a Super Admin session, and mailbox delivery.

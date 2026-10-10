# Credential rotation runbook (P0)

1. Rotate `AUTH_SECRET`, `OTP_PEPPER`, and any seeded admin passwords in Railway variables.
2. Disable `SEED_DEV` in all production environments (seed script exits in production).
3. Force password reset for accounts that ever appeared in git history (`auth.admin_set_password` flow).
4. Review Railway and application audit logs for logins using known dev identifiers.
5. Confirm no `IMPLEMENTATION_STATUS` or README files contain live passwords before merge.

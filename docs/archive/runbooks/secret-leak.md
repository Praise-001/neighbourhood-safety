# Runbook: leaked secret or credential

1. **Revoke/rotate immediately** at the provider (DB, JWT key, API keys, SMS/email/push, S3, webhook secrets).
2. JWT keys: add new `kid`, switch `JWT_ACTIVE_KID`, keep old public key for the overlap window, then remove it; force refresh-token family revocation if the private key leaked.
3. Remove the secret from the repo history (`git filter-repo`/BFG) only after rotation; assume it is compromised regardless.
4. Search logs for use of the leaked secret; check audit log for abuse.
5. Add/adjust gitleaks rules; record in the post-mortem.
6. If user data may have been accessed, continue with `breach.md`.

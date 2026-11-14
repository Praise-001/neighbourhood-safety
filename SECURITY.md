# Security Policy

## Reporting a vulnerability
Email **security@YOUR-DOMAIN** (replace before launch) with details and reproduction steps. Please do not open a public issue. We acknowledge within 2 business days and aim to fix critical issues within 7 days. We credit reporters who wish it and will not pursue good-faith research that avoids privacy violations, data destruction and service disruption.

## Scope
API, web app, mobile apps, business portal, moderation dashboard, infrastructure we operate.
Out of scope: social engineering, physical attacks, denial of service, third-party services.

## Supported versions
Only the latest production release receives security fixes.

## Engineering commitments
See `docs/STANDARDS_CHECKLIST.md` and `docs/threat-model.md`. Highlights: validated input, RBAC + RLS, hashed OTPs and tokens, encryption in transit and at rest, no PII in logs, signed webhooks, scanned uploads, audited privileged actions, tested backups.

## Secrets
Never commit secrets. If one leaks: revoke and rotate immediately, then follow `docs/runbooks/secret-leak.md`.

## Pre-launch requirement
An independent penetration test and privacy review must be completed before public launch.

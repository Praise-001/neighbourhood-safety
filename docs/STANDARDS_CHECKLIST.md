# STANDARDS_CHECKLIST

Every row must end as `Done` (with code location + proving test) or `N/A` (with reason). A phase gate fails while its rows are open. Agents update rows in the same PR that implements them.

Legend: Status `☐` todo · `◐` partial · `☑` done · `N/A`. Phase = when it should be complete.

## A. Identity, authentication, sessions
| # | Item | Phase | Status | Where (path) | Proving test |
|---|---|---|---|---|---|
| A1 | OTP hashed, single-use, 10 min, 5 attempts, constant-time | 2 | ☐ | | |
| A2 | No account enumeration (generic responses, timing-safe) | 2 | ☐ | | |
| A3 | Magic links signed, single-use, short-lived | 2 | ☐ | | |
| A4 | Password hashing argon2id (if passwords enabled) | 2 | ☐ | | |
| A5 | Hashing vs encryption decisions in `docs/data-classification.md` | 2 | ☐ | | |
| A6 | Passkeys (WebAuthn) behind flag | 2 | ☐ | | |
| A7 | TOTP 2FA + recovery codes (mandatory moderator/admin/business owner+admin) | 2 | ☐ | | |
| A8 | SSO (OIDC) for businesses behind flag | 5 | ☐ | | |
| A9 | Account lockout (progressive, anti-DoS) | 2 | ☐ | | |
| A10 | Session list, remote logout, logout-everywhere | 2 | ☐ | | |
| A11 | Access 15 min + refresh rotation with reuse detection | 2 | ☐ | | |
| A12 | Cookie flags HttpOnly/Secure/SameSite, `__Host-` prefix | 2 | ☐ | | |
| A13 | Mobile tokens in Keychain/Keystore | 6 | ☐ | | |
| A14 | API keys hashed, prefixed, scoped, expirable, revocable | 5 | ☐ | | |
| A15 | Secret rotation incl. JWT `kid` overlap, runbook tested | 9 | ☐ | | |

## B. Authorization and data access
| # | Item | Phase | Status | Where | Test |
|---|---|---|---|---|---|
| B1 | RBAC central policy, deny by default | 2 | ☐ | | |
| B2 | Least privilege: per-service DB roles, scoped IAM | 1/9 | ☐ | | |
| B3 | IDOR tests per endpoint (user/guest/business/moderator) | 3/5 | ☐ | | |
| B4 | Postgres RLS on tickets, notes, business, guest data | 2/5 | ☐ | | |
| B5 | Mass-assignment protection (DTO allow-lists) | 3 | ☐ | | |
| B6 | Append-only audit log, DB-enforced | 2 | ☐ | | |

## C. Input and attack surface
| # | Item | Phase | Status | Where | Test |
|---|---|---|---|---|---|
| C1 | Server-side validation (zod) on every endpoint | 1+ | ☐ | | |
| C2 | XSS: encoding, sanitised user content, no unsafe HTML | 3/4 | ☐ | | |
| C3 | CSRF protection for cookie-auth writes | 2/4 | ☐ | | |
| C4 | Strict nonce-based CSP + report endpoint | 1/4 | ☐ | | |
| C5 | Security headers (HSTS, nosniff, Referrer, Permissions-Policy, COOP/CORP) | 1 | ☐ | | |
| C6 | Clickjacking (`frame-ancestors 'none'`) | 1 | ☐ | | |
| C7 | SSRF safe-fetch helper (webhooks, URLs) | 5 | ☐ | | |
| C8 | Open-redirect allow-list (web returnTo, mobile deep links) | 4/7 | ☐ | | |
| C9 | Path traversal prevention (server-generated keys) | 3 | ☐ | | |
| C10 | Command injection (execFile args, sandboxed workers) | 3 | ☐ | | |
| C11 | File upload security (magic bytes, re-encode, EXIF strip, scan, quarantine, quotas) | 3 | ☐ | | |
| C12 | Webhooks HMAC + timestamp + replay window + retries + DLQ | 5 | ☐ | | |
| C13 | CORS allow-list | 1 | ☐ | | |
| C14 | Dependency vulnerabilities: audit, Dependabot/Renovate, Trivy, SBOM | 1+ | ☐ | | |
| C15 | Penetration testing: ZAP in CI, checklist, independent test before launch | 9 | ☐ | | |

## D. Data layer
| # | Item | Phase | Status | Where | Test |
|---|---|---|---|---|---|
| D1 | Indexing verified with EXPLAIN ANALYZE | 3+ | ☐ | | |
| D2 | Normalization (3NF; documented denormalizations) | 1+ | ☐ | | |
| D3 | Migrations: versioned, CI-checked, expand/contract, never edited | 1+ | ☐ | | |
| D4 | Soft deletes + hard purge job | 3/8 | ☐ | | |
| D5 | Race conditions: locks, atomic counters, optimistic locking, concurrency tests | 3 | ☐ | | |
| D6 | Connection pooling (PgBouncer) | 9 | ☐ | | |
| D7 | Read replicas + lag handling | 9 | ☐ | | |
| D8 | Backups + PITR + restore drill, RPO ≤ 5 min, RTO ≤ 1 h | 9 | ☐ | | |
| D9 | Encryption at rest (DB, storage, backups, Redis) | 9 | ☐ | | |
| D10 | Encryption in transit (TLS 1.2+, internal) + HSTS | 9 | ☐ | | |
| D11 | Time zones: UTC storage, IANA quiet hours, tests | 6/7 | ☐ | | |
| D12 | Character encoding: UTF-8, NFC, control/bidi rejection | 3 | ☐ | | |
| D13 | Data privacy: data map, consents, DSAR export/erasure, retention, breach runbook | 8/9 | ☐ | | |

## E. Reliability and resilience
| # | Item | Phase | Status | Where | Test |
|---|---|---|---|---|---|
| E1 | Timeouts on every outbound call, DB statement_timeout | 1+ | ☐ | | |
| E2 | Exponential backoff with jitter, retryable errors only | 3/7 | ☐ | | |
| E3 | Idempotency keys on all create endpoints | 3 | ☐ | | |
| E4 | Circuit breakers (SMS, email, push, moderation, geocoding) | 7 | ☐ | | |
| E5 | Queues: priorities, DLQ, stalled jobs, backlog alerts | 3/7 | ☐ | | |
| E6 | Background/cron jobs single-run, idempotent, monitored | 3 | ☐ | | |
| E7 | Stateless services | 1 | ☐ | | |
| E8 | Health checks live + ready | 1 | ☐ | | |
| E9 | Graceful shutdown (HTTP, WS, jobs, pools) | 9 | ☐ | | |
| E10 | Horizontal scaling plan documented | 9 | ☐ | | |
| E11 | Memory leaks/async: no floating promises, handlers, soak test | 9 | ☐ | | |
| E12 | Error handling RFC 7807, stable codes, request ID | 1 | ☐ | | |
| E13 | HTTP status codes correct and documented | 1+ | ☐ | | |

## F. Performance and edge
| # | Item | Phase | Status | Where | Test |
|---|---|---|---|---|---|
| F1 | Load balancer + reverse proxy | 9 | ☐ | | |
| F2 | API gateway/WAF | 9 | ☐ | | |
| F3 | Layered rate limiting | 1/8 | ☐ | | |
| F4 | Caching + invalidation + stampede protection | 3 | ☐ | | |
| F5 | CDN for media/tiles/assets | 9 | ☐ | | |
| F6 | Performance budgets enforced in CI | 4 | ☐ | | |
| F7 | Load testing (k6) published in `docs/perf/` | 7/9 | ☐ | | |
| F8 | Profiling/debugging runbook | 9 | ☐ | | |

## G. Observability and operations
| # | Item | Phase | Status | Where | Test |
|---|---|---|---|---|---|
| G1 | Structured logging with redaction | 1 | ☐ | | |
| G2 | Monitoring + alerting with runbook links | 7/9 | ☐ | | |
| G3 | Distributed tracing (OpenTelemetry) | 9 | ☐ | | |
| G4 | Error tracking (Sentry) api/web/mobile | 1 | ☐ | | |
| G5 | Uptime monitoring + canary + status page | 9 | ☐ | | |
| G6 | Cost monitoring + SMS pumping protection | 8/9 | ☐ | | |

## H. Delivery and process
| # | Item | Phase | Status | Where | Test |
|---|---|---|---|---|---|
| H1 | Env var validation at boot, `.env.example` | 1 | ☐ | | |
| H2 | Secrets manager + gitleaks | 1/9 | ☐ | | |
| H3 | Docker hardened (multi-stage, non-root, scanned) | 1/9 | ☐ | | |
| H4 | CI/CD with gates, staged deploy, rollback | 1/9 | ☐ | | |
| H5 | Staging environment (synthetic data) | 9 | ☐ | | |
| H6 | Infrastructure as Code | 9 | ☐ | | |
| H7 | Feature flags + kill switches | 2/7 | ☐ | | |
| H8 | Code review, CODEOWNERS, branch protection | 1 | ☐ | | |
| H9 | SemVer + changelog; API versioning + deprecation policy | 1/9 | ☐ | | |
| H10 | API documentation (OpenAPI in CI) | 1+ | ☐ | | |
| H11 | Test pyramid: unit / integration / e2e | 1+ | ☐ | | |
| H12 | Technical debt register + ADRs | 1+ | ☐ | | |

## I. Client quality
| # | Item | Phase | Status | Where | Test |
|---|---|---|---|---|---|
| I1 | Accessibility WCAG 2.2 AA (axe + manual screen readers) | 4/6 | ☐ | | |
| I2 | Mobile responsiveness from 320 px, low-end devices, throttled network | 4/6 | ☐ | | |

## J. Mandatory abuse-case tests
| # | Test | Phase | Status | Test path |
|---|---|---|---|---|
| J1 | IDOR | 3/5 | ☐ | |
| J2 | Mass assignment | 3 | ☐ | |
| J3 | Rate limits | 2/8 | ☐ | |
| J4 | OTP brute force | 2 | ☐ | |
| J5 | Upload abuse | 3 | ☐ | |
| J6 | SSRF | 5 | ☐ | |
| J7 | Open redirect | 4 | ☐ | |
| J8 | XSS payloads in comments | 3/4 | ☐ | |
| J9 | Parallel/duplicate submission | 3 | ☐ | |
| J10 | Refresh-token reuse | 2 | ☐ | |
| J11 | Cross-tenant access (business) | 5 | ☐ | |
| J12 | Anonymous report de-anonymisation (public payloads, timing, joins) | 3 | ☐ | |

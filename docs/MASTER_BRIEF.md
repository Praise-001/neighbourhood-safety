# MASTER PROMPT: Community Safety & Incident Ticket Platform

You are a senior full-stack engineer and technical lead. Build this product end to end, working in phases. Before writing code, read this whole brief, then produce a short plan (architecture, folder structure, phase breakdown) and wait for my "go" before Phase 1. After each phase: run tests and lint, summarize what was built, list open questions, and stop for review.

---

## 1. Product summary

A community safety platform where people report incidents ("tickets") near them and nearby users are alerted instantly. It has three audiences:

1. **Residents / public users**: report incidents, follow them, receive geofenced alerts.
2. **Guests**: can create a ticket WITHOUT an account, and come back later to track it.
3. **Businesses / organisations** (security firms, estates, utilities, hospitals, malls, local councils): register on the platform, so users can file tickets addressed to them and the business can triage and respond.

Terminology: a **ticket** is an incident report with a lifecycle (Open → Acknowledged → In progress → Resolved → Archived). Every incident on the map is a ticket.

---

## 2. Recommended stack (use this unless you find a strong reason not to, and tell me if so)

Monorepo (pnpm + Turborepo), TypeScript everywhere so types and validation schemas are shared.

| Layer | Choice | Why |
|---|---|---|
| Web (landing, guest flow, business portal, moderation dashboard) | **Next.js 15 (App Router) + Tailwind + shadcn/ui** | SEO for the landing page, SSR, fast guest flow |
| Mobile (iOS + Android) | **React Native + Expo (EAS Build)** | One codebase, TestFlight + Play internal track via EAS, background location and push supported |
| Backend API | **NestJS (Node, TypeScript)** + REST + OpenAPI (Swagger) | Structured, modular, great for queues and WebSockets. Auto-generates the OpenAPI deliverable |
| Database | **PostgreSQL + PostGIS** (Prisma or Drizzle for schema/migrations, raw SQL for geo queries) | Radius queries, clustering, heatmaps |
| Cache / queue | **Redis + BullMQ** | Geo-fanout jobs, rate limits, TTL jobs, idempotency keys |
| Realtime | **WebSocket (Socket.IO) or SSE** | Live map updates |
| Push | **FCM + APNs** (via FCM or Expo push) | Geofenced alerts |
| Media | **S3-compatible storage (AWS S3 / Cloudflare R2)**, signed upload URLs, `sharp` for resize, optional moderation API | |
| Auth | Own JWT (short-lived access + rotating refresh), OTP via **Termii / Twilio (SMS)** and email provider (Resend/Postmark) | Termii is good for Nigerian numbers |
| Observability | Sentry (crash + errors), PostHog (analytics), pino structured logs, uptime alerts | |
| Infra | Docker Compose for local; deploy API on Railway/Fly/AWS ECS; managed Postgres with PostGIS | |

Java/Spring Boot is a valid alternative for the backend, but it is slower to build with a small team and loses shared types with the web and mobile apps. Default to NestJS.

Web map: MapLibre GL (avoid vendor lock-in), with Mapbox/Google as an option. Mobile map: `react-native-maps` or MapLibre RN, with clustering.

Monorepo layout:

```
apps/
  web/        Next.js (landing, guest tickets, business portal, admin/moderation)
  mobile/     Expo React Native app
  api/        NestJS backend
packages/
  ui-tokens/  design tokens (colors, spacing, typography) shared web + mobile
  shared/     zod schemas, TS types, constants (categories, severities, TTLs)
  config/     eslint, tsconfig, prettier
infra/        docker-compose, migrations, deploy scripts
docs/         OpenAPI export, architecture, runbooks
```

---

## 3. Design system

**Brand feel:** trustworthy, calm, urgent when it needs to be. Deep navy dominates, yellow is the accent for action and alerts, white for clarity.

Define as tokens in `packages/ui-tokens` and consume in both web (Tailwind CSS variables) and mobile.

| Token | Light mode | Dark mode |
|---|---|---|
| `--bg` | `#FFFFFF` | `#050E24` (deepest navy) |
| `--surface` | `#F4F6FB` | `#0A1A3F` |
| `--surface-elevated` | `#FFFFFF` | `#102353` |
| `--primary` (navy) | `#0A1F4D` | `#1B3A8A` (lifted for contrast) |
| `--accent` (yellow) | `#FFC933` | `#FFC933` |
| `--on-primary` | `#FFFFFF` | `#FFFFFF` |
| `--text` | `#0A1F4D` | `#F2F5FF` |
| `--text-muted` | `#5B6B8C` | `#9FB0D6` |
| `--border` | `#DDE3F0` | `#1D3170` |
| severity: critical / high / medium / low | red `#E5484D` / orange `#F76B15` / yellow `#FFC933` / blue `#3E63DD` | same, tuned for dark |

Rules:
- Yellow is used sparingly: primary CTA ("Report an incident"), active states, critical highlights. Text on yellow is always navy.
- Theme toggle: Light / Dark / System. Persist the choice. No flash of wrong theme on load (Next.js: set class before hydration).
- WCAG AA contrast minimum, visible focus states, 44px touch targets, screen reader labels, dynamic type support, don't rely on color alone for severity (use icon + label).
- Typography: Inter (or Plus Jakarta Sans) for UI. Mobile-first layout.

---

## 4. Core user flows

### 4.1 Landing page (web)
- Hero with two clear CTAs: **"Report an incident"** (primary, yellow) and **"Track my ticket"** (secondary).
- Secondary links: "Sign in", "Register your business", "Download the app".
- Live preview of a public map with a few recent (coarsened) incidents, plus short "How it works" and trust/privacy sections.
- Theme toggle in header.

### 4.2 Create a ticket: three entry modes, one form
When the user taps "Report an incident", show a choice screen:
1. **Continue as guest**: no account, only an email (required, for follow-up) and optional phone.
2. **Sign in / Create account**: phone or email + OTP.
3. (Already signed in: skip straight to the form.)

Ticket form fields: category (theft, fire, accident, suspicious activity, flooding, missing person, other), description, severity, time (default now), location (auto GPS with draggable pin; on web use browser geolocation + map pin + address search), optional photo/short video (compressed before upload), **optional target business** (search registered businesses; e.g. "Report to my estate security"), and an "Report anonymously" toggle.

On submit:
- Guest: create ticket, generate a human-friendly **ticket reference** (e.g. `CSA-7K4M-92QX`, unguessable, 10+ chars of entropy), send confirmation email with the reference and a magic link. Show a success screen with the reference and an "Create an account to keep all your tickets" prompt (optional upsell, never forced).
- Authenticated: create ticket linked to the account.
- Offline (mobile): save to a local queue with an **idempotency key**, show optimistic UI, retry with backoff when network returns.
- Drafts auto-save locally.

### 4.3 Returning guests ("Track my ticket")
Two ways back in, no password needed:
1. **Ticket reference + email** → verify they match → open that ticket.
2. **Email only** → send a one-time magic link / 6-digit OTP → show all tickets created with that email.

Guest sessions are scoped, short-lived, read/comment-only on their own tickets. If a guest later registers with the same verified email, offer to merge their guest tickets into the account.

Security: rate limit lookups, generic error messages (don't reveal whether an email exists), hash the OTPs, expire in 10 minutes, lock after 5 attempts.

### 4.4 Business registration and portal
- Registration: business name, type, registration number (optional, e.g. CAC in Nigeria), contact person, official email + phone (OTP verified), service area (draw a polygon or center + radius on a map), operating hours, logo.
- Status: `pending → verified / rejected` (a moderator reviews documents). Unverified businesses can't receive tickets publicly.
- Business portal (web): inbox of tickets addressed to them or inside their service area; assign to team members; change status; post public updates to the ticket timeline; internal-only notes; SLA timers; basic analytics (tickets by category, response time, resolution rate).
- Roles inside a business: Owner, Admin, Responder, Viewer. Invite teammates by email.
- Users see a verified badge on responding businesses.

### 4.5 Residents / app features (mobile-first)
Implement everything in the original spec:
- **Onboarding:** phone/email + OTP, location permission flow (while-in-use first, then explain and upgrade to always, with clear explanation screens), home area and alert radius (500m / 1km / 5km).
- **Reporting:** all fields above, photo and video compression, anonymous mode (server must never expose the user ID in public responses), draft saving, offline queue.
- **Map and feed:** markers, clustering at low zoom, heat view, filters (category, time range, distance), incident detail with media, timeline of updates, "I see this too" confirmations, comments, auto-expiry with archive (TTL per category, e.g. flooding 24h, fire 12h, theft 7d, missing person until resolved).
- **Geofenced push alerts:** only within the user's alert radius; critical alerts bypass quiet hours; minor ones are batched; per-category settings and quiet hours; deep link from push to the ticket screen.
- **Trust and abuse:** confirmations and "false report" flags, reputation score weighting alerts, rate limits per user and per device, duplicate-report merging (same category + nearby + close in time), block / report / mute user.

---

## 5. Backend requirements

- REST API under `/v1/...` (API versioning), OpenAPI generated from code and exported to `docs/openapi.json`. WebSocket/SSE channel for live map updates, scoped by map viewport/geohash.
- **Geo-fanout service:** on ticket creation, query PostGIS (`ST_DWithin` on `geography`, with GiST index) for users whose home area/last significant location and radius cover the point, then enqueue push jobs in BullMQ. Target: push queued in under 2 seconds, delivered within a few seconds. Apply severity rules, quiet hours, category prefs, reputation weighting, block/mute lists, and dedupe.
- **Privacy:** store exact coordinates privately; public responses return coarsened coordinates (e.g. ~100–300m grid snap) for sensitive categories (missing person, suspicious activity, anything involving a home). Never expose home addresses. Anonymous reports have no user ID in any public payload (and keep the link only in a restricted audit table, if at all, documented clearly).
- **Media pipeline:** signed upload URLs, direct-to-storage upload, resize/thumbnail worker, strip EXIF GPS, optional NSFW/violence moderation hook (provider-agnostic interface).
- **Abuse controls:** rate limiting (per user, per device, per IP), duplicate clustering, shadow-ban flag, idempotency keys on all create endpoints.
- **Moderation dashboard API + web UI:** review queue, remove content, ban users, verify/reject businesses, immutable audit log of every moderator action.
- **TTL jobs:** scheduled worker expires and archives tickets per category.
- **Data rights:** account deletion and data export endpoints (NDPR/GDPR-style), with a defined retention policy. Guest data deletable via emailed link.
- **Ops:** structured logs (pino) with request IDs, Sentry, health/readiness endpoints, alerting on queue backlog and push failure rate.

### Core data model (starting point; refine in the plan)
`users`, `devices` (push tokens, last location cell), `guest_identities` (hashed email, verified_at), `tickets` (id, reference, reporter_user_id nullable, guest_identity_id nullable, is_anonymous, category, severity, status, description, location exact + public, occurred_at, expires_at, target_business_id nullable, merged_into_id nullable), `ticket_media`, `ticket_updates` (timeline: public/internal), `confirmations`, `flags`, `comments`, `businesses`, `business_members`, `business_service_areas`, `notification_prefs`, `blocks_mutes`, `reputation_events`, `moderation_actions` (audit), `otp_codes`, `idempotency_keys`.

---

## 6. Non-functional requirements
- Push within a few seconds of report.
- Battery-friendly: significant-change and geofence/region monitoring APIs, never constant GPS.
- Poor-network friendly: cached map tiles/data, optimistic UI, retry with backoff and idempotency.
- Crash reporting, analytics (privacy-respecting, consent-aware), accessibility basics.
- Tests: unit tests for fanout, dedupe, privacy coarsening, rate limits, auth; integration tests for the guest and business flows; Playwright e2e for the web guest flow; basic Detox/Maestro for the mobile reporting flow. CI on GitHub Actions (lint, typecheck, test, build).
- Security: OWASP basics, input validation with zod on every endpoint, parameterized queries, secrets via env, CORS locked down, no PII in logs.

---

## 6A. Production-grade engineering standards (MANDATORY, non-negotiable)

This is a safety product handling locations, media and personal data, so security and reliability are features. Every item below must be implemented where applicable, tested, and tracked in `docs/STANDARDS_CHECKLIST.md` (one row per item: what we did, where in the code, which test proves it). Do not mark a phase complete while any row relevant to that phase is unchecked. If an item can't apply, write why. Never guess at library behaviour: read the official docs and the full error message/stack trace, reproduce the bug, fix the root cause (not the symptom), and add a regression test.

### A. Identity, authentication and sessions
- **Authentication:** OTP (SMS/email) and magic links are single-use, hashed at rest, 10-minute expiry, max 5 attempts, constant-time comparison. Generic responses that never reveal whether an email/phone exists (prevents account enumeration).
- **Passwords (if enabled):** argon2id with per-user salt (salting is automatic in argon2/bcrypt, never roll your own). **Hashing vs encryption:** hash what you only need to verify (passwords, OTPs, API keys, guest emails for lookup); encrypt what you must read back (e.g. exact coordinates, phone numbers) with AES-256-GCM using keys from a KMS/secret store. Document each field's choice in `docs/data-classification.md`.
- **Passkeys (WebAuthn):** offer as a sign-in method for web and mobile, alongside OTP. **Magic links:** signed, single-use, short-lived, bound to the requesting email, never reusable after click.
- **Two-factor authentication:** TOTP (plus recovery codes) mandatory for moderators, business Owners/Admins and platform admins; optional for residents.
- **SSO:** OIDC/SAML SSO option for business accounts (Google/Microsoft Workspace first), behind a feature flag.
- **Account lockout:** progressive delay and temporary lock after repeated failed attempts, with an unlock-by-email flow and alerts on suspicious patterns. Guard against lockout being used as a DoS vector (lock per account+IP combination, notify the owner).
- **Session management:** list active sessions/devices, remote logout, logout-everywhere, invalidate all sessions on password/2FA change.
- **Tokens:** access token 10–15 min, refresh token rotation with **reuse detection** (reuse revokes the whole family), refresh tokens stored hashed server-side. Mobile: tokens in Keychain/Keystore (never AsyncStorage). Web: **cookie flags** `HttpOnly; Secure; SameSite=Lax` (Strict for admin) and `__Host-` prefix, no tokens in localStorage.
- **API keys (for business integrations/webhooks):** generated once, shown once, stored hashed, prefixed for identification (`csa_live_xxxx`), scoped, expirable, revocable, with last-used tracking.

### B. Authorization and data access
- **RBAC** with explicit roles (guest, user, business Responder/Admin/Owner, moderator, admin) and a central policy layer; deny by default. **Principle of least privilege** everywhere: DB users per service (API cannot DROP, workers cannot read what they don't need), narrowly scoped IAM roles, scoped API keys, short-lived credentials.
- **IDOR prevention:** every read/write checks ownership or role in the service layer, never trust IDs from the client. Use unguessable IDs (UUIDv7/ULID) externally. Write an automated test per endpoint proving user A cannot access user B's tickets, drafts, media, business inbox or guest ticket.
- **Row-level security (Postgres RLS)** on tickets, internal notes, business inboxes and guest data as defence in depth.
- **Mass assignment:** explicit DTO allow-lists via zod/class-validator with `whitelist` + `forbidNonWhitelisted`; clients can never set `role`, `reputation`, `status`, `is_verified`, `reporter_user_id`, etc.
- **Audit logs:** append-only records of auth events, role changes, moderation actions, business verification, data exports/deletions, API key use. Include actor, IP, user agent, request ID. No updates or deletes allowed at DB permission level.

### C. Input and web/API attack surface
- **Server-side data validation** on every endpoint (zod), including types, ranges, lengths, enums, coordinates inside valid bounds, and media limits. Client validation is UX only.
- **XSS:** output-encode by default, sanitize user content (comments, descriptions) with a strict allow-list sanitizer or render as plain text, no `dangerouslySetInnerHTML` without sanitization, no inline scripts.
- **CSRF:** SameSite cookies + CSRF tokens (double-submit or synchronizer) on every cookie-authenticated state-changing request; bearer-token APIs are exempt but must reject cookies.
- **Content Security Policy:** strict nonce-based CSP (no `unsafe-inline`/`unsafe-eval`), `report-to` endpoint wired to monitoring.
- **Security headers:** HSTS (preload), `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` (geolocation only where needed), COOP/CORP, via Helmet and Next.js headers config. Strict CORS allow-list.
- **Clickjacking:** `frame-ancestors 'none'` in CSP (plus `X-Frame-Options: DENY`).
- **SSRF:** any server-side fetch of a user-supplied URL (business webhooks, media URLs, link previews) goes through a safe-fetch helper: scheme allow-list, DNS resolution check, block private/loopback/link-local/metadata IPs (169.254.169.254), no redirects to blocked ranges, timeouts and size caps, egress from an isolated network where possible.
- **Open redirects:** `returnTo`/`next`/deep-link targets are validated against a same-origin or allow-listed set. Mobile deep links validated against a route allow-list.
- **Path traversal:** never build file paths from user input; storage keys are server-generated random IDs; reject `..`, absolute paths and encoded variants.
- **Command injection:** no shell execution with user-influenced strings. For ffmpeg/image tools use argument arrays (`execFile`), fixed flags, input from private temp files, resource limits, sandboxed worker.
- **File upload security:** signed upload URLs with enforced content-type and max size; verify magic bytes server-side (not just extension/MIME); allow-list formats; re-encode images/video (kills polyglots and embedded payloads); strip EXIF/GPS; random object keys; private bucket with signed read URLs or CDN with signed cookies; malware scan (ClamAV or provider) in an async quarantine step before publishing; per-user quota; serve with `Content-Disposition`/`nosniff`.
- **Webhooks (inbound and outbound):** HMAC-SHA256 signatures with timestamp, replay window (5 min), constant-time verification, idempotent handlers, retry with backoff, delivery logs, dead-letter handling, per-endpoint secrets with rotation.
- **Dependency vulnerabilities:** lockfiles committed, Dependabot/Renovate, `pnpm audit` + Trivy/Snyk in CI failing on high/critical, SBOM generation, pinned Docker base image digests, no unmaintained packages.
- **Penetration testing:** OWASP ZAP baseline + API scan in CI against staging; a documented pre-launch manual pentest checklist (OWASP ASVS L2 / Top 10 / API Top 10) in `docs/security/pentest-checklist.md`; track findings and fixes; recommend an independent pentest before public launch.

### D. Data layer
- **Indexing:** GiST on geography columns, composite and partial indexes for hot queries (status, expires_at, category, business_id, created_at), unique indexes for idempotency and ticket references. Verify with `EXPLAIN ANALYZE`; no N+1 queries.
- **Normalization:** 3NF by default; denormalize only for measured read paths (e.g. confirmation counts), with documented triggers/jobs keeping them consistent.
- **Migrations:** versioned, reviewed, reversible where possible, run in CI against a fresh DB and a prod-like snapshot, expand/contract pattern for zero-downtime changes, never edit applied migrations.
- **Soft deletes:** `deleted_at` for tickets/comments/businesses so moderation and audit work, with a scheduled **hard purge** job to honour GDPR/NDPR erasure and retention limits. Default queries exclude soft-deleted rows (enforce via a central scope/RLS).
- **Race conditions and concurrency:** transactions with correct isolation, unique constraints as the final safety net, `SELECT ... FOR UPDATE`/advisory locks for duplicate-report merging, atomic counters for confirmations/flags, optimistic locking (`version` column) on ticket status changes, idempotency keys stored with request hash. Write concurrency tests (parallel submissions of the same ticket and of the same confirmation).
- **Connection pooling:** PgBouncer (transaction mode) plus app-level pool sizing; pool exhaustion alerts.
- **Read replicas:** route heavy map/feed reads to replicas, account for replication lag (read-your-own-writes for the reporter), fall back to primary.
- **Backups and disaster recovery:** automated daily backups plus point-in-time recovery, cross-region copies, encrypted, **monthly restore drills**, defined RPO (≤5 min) and RTO (≤1 hr) in `docs/dr-runbook.md`, plus runbooks for region loss, credential leak and data corruption.
- **Encryption at rest:** DB, object storage, backups, Redis persistence (provider-managed KMS keys). **In transit:** TLS 1.2+ everywhere (clients, service-to-service, DB, Redis), HSTS, certificate auto-renewal, mTLS or private networking between internal services.
- **Time zones:** store all timestamps as UTC `timestamptz`; send ISO 8601 with offset; render in the user's zone on the client; quiet hours are evaluated in the user's stored IANA zone (e.g. `Africa/Lagos`), with DST-safe logic and tests. TTL jobs run in UTC.
- **Character encoding:** UTF-8 end to end (DB, API, email, SMS), Unicode normalization (NFC) for search and dedupe, emoji safe, SMS encoding/segment awareness, reject control characters and bidi-override tricks in user text.
- **Data privacy (GDPR/NDPR):** data map and lawful basis, consent records (location, analytics, marketing), purpose limitation, minimization, retention schedule, DSAR export and erasure endpoints with verification, breach-notification runbook, privacy policy and cookie consent, processor agreements list, no PII in logs or analytics events.

### E. Reliability and resilience
- **Timeouts everywhere:** HTTP clients, DB queries (`statement_timeout`), queue jobs, Redis, push/SMS providers, plus request-level timeouts at the gateway. No unbounded waits.
- **Exponential backoff with jitter** for all retries (push, SMS, email, webhooks, mobile offline queue), with max attempts, retry only on retryable errors.
- **Idempotency:** `Idempotency-Key` required on all create/payment-like endpoints, stored with request fingerprint and response, safe replays, 24h TTL. Queue consumers idempotent too (dedupe by job key).
- **Circuit breakers** (e.g. `opossum`) around SMS, email, FCM/APNs, moderation API, geocoding. Define fallbacks (e.g. SMS provider B, degrade to in-app alert, skip moderation but queue for review).
- **Message queues:** BullMQ with separate queues by priority (critical alerts get their own high-priority queue and workers), retries, dead-letter queues, stalled-job handling, backlog and age alerts, poison-message handling, job payloads contain IDs not PII.
- **Background jobs and cron jobs:** all scheduled work (TTL expiry, batching minor alerts, purges, digest emails, backups verification) runs as repeatable BullMQ jobs with leader election/locking so it executes once in a multi-instance deployment, is idempotent, logged, and monitored for missed runs.
- **Stateless services:** no in-memory sessions or local disk state; sessions/rate limits/cache in Redis; any instance can serve any request.
- **Health checks:** `/health/live` (process up) and `/health/ready` (DB, Redis, queue reachable) used by the load balancer/orchestrator.
- **Graceful shutdown:** handle SIGTERM, stop accepting traffic, drain in-flight requests and WebSocket connections, finish or requeue jobs, close DB/Redis pools, within the orchestrator's grace period.
- **Scaling:** design for horizontal scaling of API, workers and WebSocket nodes (Redis adapter for Socket.IO pub/sub); vertical scaling only for the DB primary and Redis at first; document the scaling plan and bottlenecks.
- **Memory leaks and async:** no floating promises (`no-floating-promises` lint), `unhandledRejection`/`uncaughtException` handlers, cleanup of listeners, timers and sockets, bounded caches/maps, streams for media instead of buffering, heap/RSS monitoring and a soak test.
- **Error handling:** typed domain errors, a global exception filter, consistent **RFC 7807** `application/problem+json` responses with a stable error `code` and a request ID, no stack traces or internals to clients, errors logged once with context.
- **HTTP status codes:** use them correctly: 200/201/202/204, 400 (malformed), 401 (unauthenticated), 403 (forbidden), 404, 409 (conflict/duplicate), 410, 413, 415, 422 (validation), 429 (with `Retry-After`), 500, 502, 503 (with `Retry-After`), 504. Document in OpenAPI and cover in tests.

### F. Performance, traffic and edge
- **Load balancer + reverse proxy:** an L7 load balancer (ALB/Cloudflare) with TLS termination, plus Nginx/Caddy or ingress as reverse proxy (gzip/brotli, request size limits, slowloris protection, sticky sessions NOT required thanks to stateless design). WebSocket-aware routing.
- **API gateway:** a gateway layer (Kong, AWS API Gateway or Cloudflare) for routing by version, auth pre-checks, global and per-key throttling, request size limits, WAF rules and bot protection. Document the choice and what lives at the gateway vs in the app.
- **Rate limiting (layered):** edge/WAF per IP, gateway per API key, app-level per user and per device (Redis sliding window/token bucket), and tight limits on OTP, login, lookup-by-reference and report creation. Return 429 with `Retry-After`.
- **Caching and invalidation:** Redis for hot reads (map tiles of incident clusters by geohash, business profiles), HTTP caching (`ETag`, `Cache-Control`, `stale-while-revalidate`) for public data, explicit invalidation on ticket create/update/expire (event-driven, by geohash/key tags), short TTLs for safety-critical data, protection against cache stampede (locking/jitter). Never cache private or personalized responses in shared caches.
- **CDN:** media, static assets and map tiles behind a CDN with signed URLs for private media, immutable hashed assets, image resizing at the edge.
- **Performance budgets:** web LCP < 2.5 s, INP < 200 ms, CLS < 0.1 on mid-range mobile over 3G/4G; JS budget per route (e.g. < 170 KB gz initial); mobile cold start < 2.5 s; API p95 < 300 ms for reads and < 500 ms for ticket creation; push enqueue < 2 s. Enforce with Lighthouse CI and bundle-size checks failing the build.
- **Load testing:** k6 scripts for ticket creation bursts (e.g. an incident causing 10k nearby users to be alerted), map reads, WebSocket fan-out and OTP endpoints; run against staging before release; publish results and capacity limits.
- **Profiling and debugging:** CPU/heap profiling recipe (clinic.js/0x, Chrome DevTools, Flipper), slow-query log and `pg_stat_statements`, source maps uploaded to Sentry, a debugging runbook.

### G. Observability and operations
- **Structured logging:** JSON (pino) with request ID, trace ID, user/business ID (never raw PII), levels, sampling; PII/secret redaction in logger config; log retention policy.
- **Monitoring and alerting:** metrics (Prometheus/Grafana or provider equivalent) for RED/USE signals, queue depth/age, push success rate and latency, DB connections, replication lag, error rate, p95 latency, fanout time. Alerts routed to on-call (PagerDuty/Opsgenie/Slack) with severity levels and runbook links. Alert on symptoms users feel, not just CPU.
- **Distributed tracing:** OpenTelemetry across web, API, workers and queue jobs (trace context propagated through BullMQ job data), exported to a backend (Tempo/Jaeger/Datadog).
- **Error tracking:** Sentry for API, web and mobile (crashes, ANRs, releases, source maps, user-consent-aware).
- **Uptime monitoring:** external synthetic checks for landing page, API health, guest ticket lookup and a full "create ticket → alert delivered" canary from outside; public status page.
- **Cost monitoring:** cloud budgets and anomaly alerts, per-service cost tags, SMS/push/moderation usage dashboards with hard caps and alerts (SMS pumping/toll fraud protection: geo-allow-listing, per-number limits).

### H. Delivery and engineering process
- **Environment variables:** validated at boot with a zod schema (fail fast), `.env.example` documented, no secrets in the repo or client bundles (only `NEXT_PUBLIC_`/`EXPO_PUBLIC_` for truly public values).
- **Secrets management:** AWS Secrets Manager / GCP Secret Manager / Doppler / Vault, injected at runtime, never baked into images; secret scanning (gitleaks) in pre-commit and CI. **Secret rotation:** documented, automated where possible (DB creds, JWT signing keys with `kid` and overlapping validity, API keys, webhook secrets, third-party tokens), with a tested rotation runbook and a leak-response procedure.
- **Docker:** multi-stage builds, minimal base images, non-root user, read-only filesystem where possible, `.dockerignore`, healthchecks, pinned digests, image scanning, reproducible builds.
- **CI/CD:** GitHub Actions: lint, typecheck, unit/integration/e2e tests, migration check, dependency and image scans, secret scan, SAST (CodeQL/Semgrep), build, deploy to staging automatically, production via approval with automatic rollback on failed health checks, blue/green or canary deploys, database migrations as a separate controlled step. Mobile via EAS with OTA update policy.
- **Staging environments:** a prod-like staging (same infra via IaC, anonymized/synthetic data only, never real user data), preview environments per PR for web.
- **Infrastructure as Code:** Terraform (or Pulumi) for all cloud resources, state in a remote locked backend, plan reviewed in PRs, no console-only changes.
- **Feature flags:** (e.g. GrowthBook/Unleash/PostHog flags) for passkeys, SSO, video upload, moderation provider, new alert logic; gradual rollout, kill switches for push fanout and uploads.
- **Code review and branching:** trunk-based development with short-lived branches, required PR review (CODEOWNERS for auth, payments-like and security code), PR template with security/privacy/test checklist, branch protection, signed commits encouraged, conventional commits.
- **Semantic versioning:** SemVer for the apps and shared packages, automated changelogs (changesets/release-please), git tags per release. **API versioning:** URL versions (`/v1`), documented deprecation policy and `Sunset`/`Deprecation` headers, backward-compatible changes within a version, contract tests to catch breaking changes.
- **API documentation:** OpenAPI generated from code and validated in CI, examples and error schemas included, rendered docs site, Postman collection export, webhook docs for businesses.
- **Testing strategy:** pyramid with many fast **unit** tests (business rules, coarsening, quiet hours, reputation), focused **integration** tests (API + Postgres/PostGIS + Redis via Testcontainers, queue flows, authz matrix), few critical **end-to-end** tests (Playwright for guest flow/business portal, Maestro/Detox for mobile report-offline-then-sync). Coverage gates on critical modules, flaky test policy, test data factories, security regression tests for every vulnerability class above.
- **Technical debt:** log shortcuts in `docs/tech-debt.md` with owner and severity, no untracked TODOs (lint rule requiring ticket link), reserve capacity each phase to pay down debt, ADRs for significant decisions.

### I. Client-side quality
- **Accessibility:** WCAG 2.2 AA: semantic HTML, labels, focus management, keyboard navigation, ARIA only where needed, screen reader support (VoiceOver/TalkBack tested), reduced motion, text scaling, color-independent severity cues, accessible map alternatives (list view), automated axe checks in CI plus manual checks.
- **Mobile responsiveness:** mobile-first layouts verified at 320px up to desktop, safe-area handling, touch-friendly controls, tested on low-end Android devices and slow networks (throttled 3G in CI for key flows).

### Enforcement
1. Create `docs/STANDARDS_CHECKLIST.md` in Phase 1 listing every bold item above, and keep it current.
2. Add a `SECURITY.md` (vulnerability disclosure policy) and `docs/threat-model.md` (STRIDE-style, covering guest flow, anonymous reporting, geo-fanout abuse, business impersonation, malicious media, push spam, location privacy and stalking/doxxing risks) in Phase 1, and revisit each phase.
3. Every phase ends with a **Definition of Done gate:** tests green, lint/typecheck clean, security scans clean, checklist rows updated, docs updated, and a short report of risks left open.
4. Abuse-case tests are mandatory (not optional) for: IDOR, mass assignment, rate limits, OTP brute force, upload abuse, SSRF, open redirect, XSS payloads in comments, duplicate/parallel submission, and refresh token reuse.

---

## 7. Phases (stop and report after each)

1. **Foundation:** monorepo, shared tokens/schemas, Docker Compose (Postgres+PostGIS, Redis), API skeleton, CI, theme system with light/dark.
2. **Auth and identity:** OTP signup, JWT, guest identity + magic link, ticket-reference lookup.
3. **Tickets core:** create/read/update, guest + authed + anonymous modes, idempotency, media upload pipeline, public coordinate coarsening, TTL.
4. **Web:** landing page, guest ticket flow, "Track my ticket", ticket detail, public map.
5. **Businesses:** registration, verification, portal, roles, assignment, timeline updates.
6. **Mobile app:** onboarding, permissions, reporting with offline queue, map/feed, filters, ticket detail.
7. **Alerts:** geo-fanout, BullMQ, FCM/APNs, severity rules, quiet hours, deep links.
8. **Trust and moderation:** confirmations, flags, reputation, dedupe merging, block/mute, moderation dashboard, audit log.
9. **Hardening and release:** load test fanout, accessibility pass, privacy review, OpenAPI docs, README, EAS builds to TestFlight and Play internal, demo script.

## 8. Working rules
- Ask before adding paid third-party services; list free-tier options first.
- Use environment variables and `.env.example` for all secrets; never commit secrets.
- Keep functions small, typed, and tested; no `any` without justification.
- Write migrations for every schema change.
- Record architecture decisions in `docs/adr/` (one short file each).
- If a requirement here conflicts or is ambiguous, state your assumption and continue rather than blocking, unless it affects security or privacy, in which case ask.

## 9. Deliverables
Mobile builds on TestFlight and Play internal track, full source, OpenAPI docs, setup README (local run in under 10 minutes), architecture doc, seed data script, and a demo script for a short video covering: guest ticket → push alert → business response → guest returns via reference + email.

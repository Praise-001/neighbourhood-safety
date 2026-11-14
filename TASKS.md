# TASKS.md: Project plan and progress

Legend: `[ ]` todo · `[~]` in progress (add agent + branch) · `[x]` done · `[!]` blocked (add reason)
Task IDs: `P<phase>-<nn>`. Every task ends with the Definition of Done in `docs/WORKFLOW.md`.
Lanes: `infra` `api` `web` `mobile` `shared`

**Current phase:** 0

---

## Phase 0: Plan (human approval gate)
- [ ] P0-01 `shared` Agent produces plan: architecture summary, folder structure, risks, assumptions
- [ ] P0-02 `shared` Human reviews and says "go"

## Phase 1: Foundation
- [ ] P1-01 `infra` Monorepo (pnpm + Turborepo), shared eslint/tsconfig/prettier, husky + lint-staged, commitlint
- [ ] P1-02 `infra` Docker Compose: Postgres+PostGIS, Redis, MinIO (S3), Mailpit
- [ ] P1-03 `infra` CI (GitHub Actions): lint, typecheck, test, build, gitleaks, dependency audit, CodeQL/Semgrep
- [ ] P1-04 `shared` `packages/ui-tokens` with light/dark tokens (see `docs/DESIGN_SYSTEM.md`)
- [ ] P1-05 `shared` `packages/shared`: zod schemas/enums (categories, severities, statuses, TTLs)
- [ ] P1-06 `api` NestJS skeleton: config validation (zod), pino logging, request IDs, global error filter (RFC 7807), health endpoints, OpenAPI, Helmet, CORS, rate-limit module
- [ ] P1-07 `api` DB layer + migrations tooling, PostGIS enabled, seed script
- [ ] P1-08 `web` Next.js skeleton with theme system (light/dark/system, no flash), CSP + security headers
- [ ] P1-09 `mobile` Expo skeleton with theme, navigation, Sentry
- [ ] P1-10 `shared` Create `SECURITY.md`, `docs/threat-model.md`, `docs/STANDARDS_CHECKLIST.md` (already templated), ADR-0001 stack
- **Gate:** CI green on empty app; `pnpm dev` works from a clean clone in under 10 minutes

## Phase 2: Auth and identity
- [ ] P2-01 `api` Users, devices, sessions schema + migrations
- [ ] P2-02 `api` OTP (phone via Termii/Twilio, email via Resend): hashed, 10 min expiry, 5 attempts, rate limits, no enumeration
- [ ] P2-03 `api` JWT access (15 min) + refresh rotation with reuse detection; cookie flags for web
- [ ] P2-04 `api` Guest identity: hashed email, magic link + OTP, scoped guest session
- [ ] P2-05 `api` Ticket-reference + email lookup (rate limited, generic errors)
- [ ] P2-06 `api` Account lockout, session list, logout-everywhere
- [ ] P2-07 `api` TOTP 2FA + recovery codes (required for moderator/admin/business owner)
- [ ] P2-08 `api` Passkeys (WebAuthn) behind feature flag
- [ ] P2-09 `api` RBAC guard + policy layer + Postgres RLS baseline
- [ ] P2-10 `api` Audit log table (append-only) and writer
- [ ] P2-11 `api` Abuse-case tests: OTP brute force, refresh reuse, enumeration, lockout
- **Gate:** auth abuse tests green; checklist section A and B rows updated

## Phase 3: Tickets core
- [ ] P3-01 `api` Tickets schema: categories, severity, status lifecycle, exact + public geometry, TTL, reference generator, soft delete
- [ ] P3-02 `api` Create ticket (authed, guest, anonymous) with idempotency keys; anonymous never exposes user ID
- [ ] P3-03 `api` Public coordinate coarsening per category (+ unit tests)
- [ ] P3-04 `api` Signed upload URLs, media worker: magic-byte check, re-encode, EXIF strip, thumbnails, malware scan hook, moderation interface
- [ ] P3-05 `api` Read endpoints: by id, by viewport (bbox), radius query, filters, pagination; IDOR-safe
- [ ] P3-06 `api` Ticket updates timeline (public vs internal), comments, "I see this too" confirmations (atomic)
- [ ] P3-07 `api` Duplicate-report merging (same category + radius + time window) with advisory locks + concurrency tests
- [ ] P3-08 `api` TTL expiry/archive repeatable job (single-run locking)
- [ ] P3-09 `api` Realtime channel (WebSocket/SSE) scoped by geohash/viewport, Redis pub/sub adapter
- [ ] P3-10 `api` Abuse-case tests: IDOR, mass assignment, upload abuse, parallel submissions
- **Gate:** OpenAPI covers all endpoints; privacy tests prove anonymous and coarsening rules

## Phase 4: Web (landing + guest flow)
- [ ] P4-01 `web` Landing page: hero, "Report an incident", "Track my ticket", "Register your business", public map preview, theme toggle
- [ ] P4-02 `web` Entry choice screen: Continue as guest / Sign in / Create account
- [ ] P4-03 `web` Ticket form: all fields, map pin + geolocation + address search, media upload with client compression, anonymous toggle, target business picker
- [ ] P4-04 `web` Guest success screen with reference + optional "create account" prompt
- [ ] P4-05 `web` "Track my ticket": reference+email and email-only magic link/OTP flows
- [ ] P4-06 `web` Ticket detail: media, timeline, confirmations, comments
- [ ] P4-07 `web` Public map: clustering, heat view, filters
- [ ] P4-08 `web` Accessibility pass (axe + manual), responsive 320px up, performance budgets in CI
- [ ] P4-09 `web` Playwright e2e: guest report, return via reference, return via magic link
- **Gate:** Lighthouse CI budgets met; e2e green

## Phase 5: Businesses
- [ ] P5-01 `api` Businesses, members, roles (Owner/Admin/Responder/Viewer), service areas, invitations
- [ ] P5-02 `api` Verification workflow: pending/verified/rejected, document upload, moderator review
- [ ] P5-03 `api` Business inbox, assignment, status changes, public updates vs internal notes, SLA timers
- [ ] P5-04 `api` Webhooks to businesses (HMAC, replay protection, backoff, DLQ) + scoped API keys
- [ ] P5-05 `web` Business registration flow
- [ ] P5-06 `web` Business portal: inbox, ticket workspace, team management, analytics
- [ ] P5-07 `web` Business SSO (OIDC) behind feature flag
- [ ] P5-08 `api` Abuse-case tests: business impersonation, cross-tenant IDOR, SSRF on webhook URLs
- **Gate:** tenant isolation tests green (including RLS)

## Phase 6: Mobile app
- [ ] P6-01 `mobile` Onboarding: signup/OTP, location permission flow (while-in-use then always, explanation screens), home area + radius
- [ ] P6-02 `mobile` Report flow: form, camera/video capture + compression, GPS + pin adjust, anonymous mode
- [ ] P6-03 `mobile` Drafts + offline queue with idempotency keys, exponential backoff, optimistic UI
- [ ] P6-04 `mobile` Map + feed: clustering, heat, filters, cached tiles
- [ ] P6-05 `mobile` Ticket detail, confirmations, comments, block/report/mute
- [ ] P6-06 `mobile` Notification settings: per category, quiet hours (IANA zone), batching
- [ ] P6-07 `mobile` Battery-friendly location (significant-change/geofencing), deep links
- [ ] P6-08 `mobile` Maestro/Detox e2e: report offline then sync
- **Gate:** tested on low-end Android and iOS; accessibility checked with VoiceOver/TalkBack

## Phase 7: Alerts
- [ ] P7-01 `api` Geo-fanout service: PostGIS `ST_DWithin` + BullMQ queues (critical on its own priority queue)
- [ ] P7-02 `api` FCM + APNs delivery with circuit breaker, retries/backoff, DLQ, token cleanup
- [ ] P7-03 `api` Severity rules: critical bypasses quiet hours; minor batched; per-category prefs; block/mute lists; reputation weighting
- [ ] P7-04 `api` Deep link payloads validated against route allow-list
- [ ] P7-05 `infra` Alerts + dashboards: queue depth/age, push success rate, fanout latency
- [ ] P7-06 `infra` k6 load test: 10k-recipient fanout; target push queued < 2 s
- **Gate:** load test results published in `docs/perf/`

## Phase 8: Trust and moderation
- [ ] P8-01 `api` False-report flags, reputation events/score, shadow-ban flag
- [ ] P8-02 `api` Moderation API: review queue, remove content, ban, business verification, audit log
- [ ] P8-03 `web` Moderation dashboard (2FA required)
- [ ] P8-04 `api` Per-user/per-device/per-IP rate limits tuned; SMS pumping protection
- [ ] P8-05 `api` Data rights: export + erasure endpoints, retention purge job, guest deletion link
- **Gate:** moderation actions all appear in audit log; erasure verified end to end

## Phase 9: Hardening and release
- [ ] P9-01 `infra` Terraform for staging + prod, secrets manager, backups + PITR, restore drill documented
- [ ] P9-02 `infra` CDN, WAF, gateway/reverse proxy config, graceful shutdown + readiness verified
- [ ] P9-03 `infra` OpenTelemetry tracing, Sentry, uptime canary, status page, cost budgets and alerts
- [ ] P9-04 `shared` Full pass of `docs/STANDARDS_CHECKLIST.md`; ZAP scan; pre-launch pentest checklist; recommend independent pentest
- [ ] P9-05 `shared` Privacy review: data map, consent records, privacy policy, breach runbook
- [ ] P9-06 `mobile` EAS builds to TestFlight + Play internal track
- [ ] P9-07 `shared` OpenAPI docs site, setup README verified on a clean machine, demo script (guest ticket → alert → business response → guest returns)

---

## Cross-lane requests
(Agents add rows here: `from-lane → to-lane: request`)

## Decisions log
(Link ADRs in `docs/adr/`)

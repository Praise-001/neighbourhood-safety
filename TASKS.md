# TASKS.md: Lean plan (zero-cost academic scope, see docs/adr/0003-zero-cost-student-scope.md)

Legend: `[ ]` todo · `[~]` in progress (agent + branch) · `[x]` done · `[!]` blocked (reason)
Task IDs: `P<phase>-<nn>`. Every task ends with the Definition of Done in `docs/WORKFLOW.md` (lean: tests, lint, typecheck, RLS/authz checks, checklist rows, docs).
Lanes: `app` (Next.js) · `db` (Supabase SQL/RLS) · `infra` (CI, config)

**Current phase:** 0

---

## Phase 0: Re-plan (human approval gate)
- [x] P0-01 Original plan produced (superseded by ADR-0003)
- [ ] P0-02 `infra` Revise PLAN.md, ARCHITECTURE.md, AGENTS.md, README, STANDARDS_CHECKLIST (N/A rows) to match ADR-0003; verify free tiers with source URLs (no card); keep each doc short
- [ ] P0-03 Human reviews and says "go"

## Phase 1: Foundation
- [ ] P1-01 `infra` Next.js (TypeScript strict, Tailwind, shadcn/ui, ESLint, Prettier), pnpm, env validation (zod), `.env.example`
- [ ] P1-02 `app` Theme tokens: navy/yellow/white, light/dark/system, no flash, WCAG AA contrast check
- [ ] P1-03 `app` Security headers + nonce CSP, safe error handling, request validation helper
- [ ] P1-04 `db` Supabase project, PostGIS enabled, migration workflow, seed script (synthetic data)
- [ ] P1-05 `infra` CI: lint, typecheck, unit tests, build, secret scan, dependency audit
- **Gate:** `pnpm dev` works from a clean clone; CI green; theme toggle works

## Phase 2: Identity
- [ ] P2-01 `db` Profiles, roles (user, business member, admin), RLS baseline + RLS tests
- [ ] P2-02 `app` Email OTP / magic-link sign-in (Supabase Auth), session handling, cookie flags, CSRF-safe patterns
- [ ] P2-03 `db` Guest identity: hashed email, ticket reference generator (unguessable)
- [ ] P2-04 `app` Guest return: reference + email, and email-only OTP/magic link; generic errors; rate limits
- [ ] P2-05 `app` Basic rate limiting (OTP, lookup, ticket create)
- **Gate:** enumeration, brute-force and RLS tests pass

## Phase 3: Tickets
- [ ] P3-01 `db` Tickets schema (categories, severity, status, exact + public location, expiry), RLS
- [ ] P3-02 `app` Create ticket: guest, signed-in, anonymous (no identity exposed), idempotency key
- [ ] P3-03 `app` Public coordinate coarsening per category + unit tests
- [ ] P3-04 `app` Image upload: client-side compression and EXIF strip, type/size limits, Supabase Storage policies
- [ ] P3-05 `db` Read queries: by id, bounding box, radius, filters, pagination (IDOR-safe via RLS)
- [ ] P3-06 `app` Timeline updates, comments (sanitized), "I see this too" (atomic, one per user)
- [ ] P3-07 `db` Auto-expiry job (pg_cron or free scheduled route)
- [ ] P3-08 `app` Abuse tests: IDOR, mass assignment, upload abuse, XSS payloads, parallel submits
- **Gate:** privacy tests prove anonymous and coarsening rules

## Phase 4: Web UI
- [ ] P4-01 `app` Landing page: Report an incident, Track my ticket, Register business, theme toggle, disclaimer banner
- [ ] P4-02 `app` Entry choice: continue as guest / sign in
- [ ] P4-03 `app` Ticket form: map pin, geolocation, address search, image, anonymous toggle, business picker
- [ ] P4-04 `app` Success screen with reference; "Track my ticket" flows
- [ ] P4-05 `app` Ticket detail page
- [ ] P4-06 `app` Public map: markers, clustering, filters
- [ ] P4-07 `app` PWA manifest + service worker; accessibility pass (axe + keyboard); responsive from 320 px
- [ ] P4-08 `app` Playwright e2e: guest report, return via reference, return via magic link
- **Gate:** e2e green; accessibility check clean

## Phase 5: Businesses
- [ ] P5-01 `db` Businesses, members (owner/responder), service area, RLS tenant isolation
- [ ] P5-02 `app` Business registration; status pending/verified/rejected
- [ ] P5-03 `app` Business inbox, status changes, public updates vs internal notes
- [ ] P5-04 `app` Abuse tests: cross-business access, impersonation
- **Gate:** tenant isolation tests pass

## Phase 6: Alerts
- [ ] P6-01 `app` Home area + radius (500 m / 1 km / 5 km), notification preferences, quiet hours
- [ ] P6-02 `db` Matching with `ST_DWithin`; severity rules (critical bypasses quiet hours); dedupe
- [ ] P6-03 `app` In-app realtime alerts (Supabase Realtime)
- [ ] P6-04 `app` Web Push (VAPID) with validated deep link to the ticket
- **Gate:** report on one device alerts a second device inside the radius, and not outside

## Phase 7: Trust and admin
- [ ] P7-01 `app` Flags, auto-hide after N flags, block/mute
- [ ] P7-02 `app` Admin page: moderation queue, remove content, ban user, approve/reject business
- [ ] P7-03 `db` Simple audit log (append-only) for admin actions
- [ ] P7-04 `app` Delete my account and data; privacy notice page
- **Gate:** every admin action appears in the audit log

## Phase 8: Finish and demo
- [ ] P8-01 `infra` Deploy to free hosting; verify HTTPS and env config
- [ ] P8-02 `infra` Seed demo data script (synthetic)
- [ ] P8-03 `infra` Final pass: checklist rows (done or N/A with reason), README, demo script, "future work" section for the report
- **Gate:** full demo runs end to end

## Stretch (only if time remains)
Expo Go mobile client · duplicate-report merging · heat map · reputation score · TOTP for admin

---
## Cross-lane requests
## Decisions log
ADR-0002 dependency versioning policy · ADR-0003 zero-cost academic scope

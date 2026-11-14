# ADR-0003: Zero-cost academic scope (overrides other docs where they conflict)

Status: Accepted by owner · Date: 2026-11-14

## Context
This is an IT (industrial training) project. Goal: a working, well-built demo for supervisors and a report. Budget: zero. No real users, no real incident data, no public launch.

## Decision

### 1. Hard constraints
- **Cost = zero.** No paid service. No account that requires a card. If a signup asks for a card, STOP and pick another option.
- **Synthetic data only.** Show a visible banner: "Academic prototype. Not for real emergencies."
- **Verify every free-tier claim** from the provider's official pricing/docs page before relying on it. Record the source URL and date in `docs/PLAN.md`. Free tiers change.

### 2. Lean stack (replaces the NestJS/Redis/BullMQ/Expo/Docker parts of ADR-0001)
| Need | Choice | Why |
|---|---|---|
| App | **One Next.js app** (App Router, TypeScript, Tailwind, shadcn/ui), responsive and installable **PWA** | One codebase; no App Store/Play fees; works on phones |
| Database, auth, storage, realtime | **Supabase free project** (Postgres + PostGIS, Auth, Storage, Realtime, RLS) | Replaces API server, queue, auth code, file server |
| Auth | Email OTP / magic link only (no SMS, no passwords) | SMS costs money |
| Alerts | PostGIS `ST_DWithin` + in-app realtime + **Web Push (VAPID)** | No FCM/APNs accounts |
| Email | One free-tier provider (e.g. Resend/Brevo) or Supabase built-in for demo | Guest confirmations |
| Maps | MapLibre GL + a free no-card tile source; Nominatim geocoding with debounce | |
| Hosting | Vercel Hobby (or Cloudflare Pages) + Supabase free | Free, HTTPS included |
| Scheduling (expiry) | `pg_cron` if available on free tier, else a free scheduled route | |
| CI | GitHub Actions free minutes | |
| Local dev | `pnpm dev` against the hosted Supabase dev project. **No Docker needed.** | |
Keep versions policy from ADR-0002 (current stable majors, verified with `dist-tags`).

### 3. In scope (must build)
Guest or signed-in ticket creation (+ anonymous mode); ticket reference + email return flow; business registration, admin approval, simple inbox and public updates; public map with filters and clustering; ticket detail with timeline, comments, "I see this too"; geofenced alerts (home area + radius, quiet hours, critical bypass); confirmations and flags; admin moderation page; theme (navy/yellow/white, light/dark/system); data deletion for own account.

### 4. Out of scope (document as "future work" in the report)
Native mobile app (optional stretch via Expo Go), SMS/OTP by phone, passkeys, SSO, TOTP (optional for admin), API keys and webhooks, SLA timers and analytics, BullMQ/Redis, read replicas/PgBouncer, CDN/WAF, Terraform, OpenTelemetry, k6 load testing, disaster-recovery drills, penetration test, legal review, app store releases, video upload, AI moderation.

### 5. Security floor (free, so still mandatory)
Server-side validation (zod); RLS on every table with tests; authorization + IDOR tests; anonymous reports never expose user identity; coarse public coordinates for sensitive categories; EXIF stripped (client-side re-encode); strict CSP + security headers; no secrets in git (`.env` ignored, secret scan in CI); dependency audit in CI; basic rate limiting on OTP, ticket creation and guest lookup; no PII/tokens/coordinates in logs; XSS-safe rendering of user text; upload limits (type, size); generic errors (no account enumeration).

### 6. Handling the existing docs
- Do **not** delete anything. In `docs/STANDARDS_CHECKLIST.md` mark out-of-scope rows `N/A` with the reason "out of scope per ADR-0003". This shows deliberate engineering choices and feeds the report.
- Keep the rows in section 5 above as required.
- `AGENTS.md` hard rules still apply. Lanes collapse to `app`, `db`, `infra`.
- `docs/MASTER_BRIEF.md` is now historical.
- If anything here conflicts with another document, **this ADR wins**.

### 7. Free-tier risks to plan for
Projects may pause after inactivity (unpause before demos), storage/bandwidth/email caps, cold starts, push on iOS requires installing the PWA to the home screen. Seed demo data with a script.

### 8. If this is ever used by real people
Reopen every `N/A` row first: legal review, penetration test, SMS/phone verification, monitoring and backups, moderation staffing.

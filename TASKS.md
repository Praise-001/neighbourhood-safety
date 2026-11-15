# TASKS.md: 14-hour sprint (replaces all earlier task lists)

Scope and rules: `docs/adr/0004-sprint-scope.md`. Work strictly top to bottom. Each block has a time budget; if a block runs over, drop its optional items and move on. Legend: `[ ]` todo · `[x]` done.

## Block 0: Setup (45 min)
- [x] S0-01 Create the Next.js app in the repo root (TypeScript, Tailwind, App Router) with pnpm.
- [x] S0-02 Theme: navy, yellow, white tokens; light and dark with a toggle; disclaimer banner.
- [x] S0-03 **Owner action:** create the free Supabase project (agent gives exact steps); enable `postgis`; put the URL and anon key in `.env.local`; add `.env.example`.
- [x] S0-04 Basic security headers in `next.config`.

## Block 1: Database (60 min)
- [x] S1-01 SQL migration (see ADR-0004 "Data shape rule"):
  - `profiles` (role user or admin, banned flag)
  - `tickets` (**public columns only**: reference code unique, category, severity, description, status, public location, is_anonymous, created_at, expires_at, flag_count, hidden)
  - `ticket_private` (ticket id, exact location, reporter id nullable, reporter email hash nullable)
  - `ticket_updates`, `comments`, `confirmations` (unique per user per ticket), `flags`, `alert_settings` (home location, radius)
- [x] S1-02 Row-level security: public can read non-hidden, non-expired rows of `tickets`; `ticket_private` readable only by its owner and admins; only owners and admins change their own rows; only admins can hide or ban.
- [x] S1-03 Postgres function returning tickets within a radius of a point and within a bounding box, filtered by category and time.
- [x] S1-04 Seed script with about 30 synthetic incidents around one city.

## Block 2: Core reporting (120 min)
- [x] S2-01 Report form with zod validation: all fields, severity, time, anonymous toggle, email for no-account reports.
- [x] S2-02 Location picker: GPS button plus draggable pin on a MapLibre map; address search only on button press (no as-you-type), max one request per second, descriptive User-Agent.
- [x] S2-03 Public coordinate rounding for sensitive categories (with unit tests).
- [x] S2-04 Photo upload: re-encode in the browser to strip location data, limit type and size, store in Supabase Storage.
- [x] S2-05 Reference code generator and success screen showing the code; simple public page where entering a code shows that ticket.
- [x] S2-06 Simple abuse limit on report creation.

## Block 3: Map and detail (120 min)
- [x] S3-01 Map page with markers, clustering, and filters by category and time range.
- [x] S3-02 Feed list view of the same data, newest first, with distance when location is known.
- [x] S3-03 Ticket detail page: info, photo, timeline, comments, "I see this too" button (one per user, atomic).
- [x] S3-04 *(optional)* Email magic-link sign-in; signed-in users get their reports linked to them.

## Block 4: Alerts (60 min)
- [x] S4-01 Alert settings page: set home on the map, choose radius.
- [x] S4-02 Supabase Realtime subscription on `tickets`: when a new ticket is created inside the radius, show an in-app banner; critical severity gets a stronger style.
- [x] S4-03 Test with two browser windows: report in one, alert in the other inside the radius, none outside.

## Block 5: Trust and admin (60 min)
- [x] S5-01 Flag-as-false button; auto-hide at 3 flags.
- [x] S5-02 Admin page: list flagged and hidden reports, restore or remove, ban a user.
- [x] S5-03 Basic row-level security tests: public data never exposes the reporter, a normal user cannot hide tickets, banned users cannot report, `ticket_private` is not readable by others.

## Block 6: Polish and deploy (90 min)
- [x] S6-01 Accessibility pass: labels, focus, contrast, works at phone width.
- [x] S6-02 Empty, loading and error states on every page.
- [ ] S6-03 **Owner action:** push the repo to GitHub, then deploy to Vercel (agent gives exact steps); set env vars; check the live link end to end.
- [x] S6-04 README with setup steps, a short architecture note, and a future-work list (everything cut in ADR-0004).

## Block 7: Buffer and demo prep (60 min)
- [ ] S7-01 Fix whatever is broken. Rehearse the demo: report without an account, see it on the map, get an alert in a second window, flag a report, admin removes it.
- [ ] S7-02 Screenshots for the report.

**Planned total:** about 10.5 hours, leaving about 3.5 hours of slack.

**If you fall behind, cut from the bottom of the value list in this order:** S3-04 (magic-link sign-in), then S3-02 (feed list), then the ban feature in S5-02.

## Owner touchpoints (the only times the agent should stop)
1. S0-03 create the Supabase project.
2. S6-03 GitHub push and Vercel sign-in.
3. S7-01 check the demo.

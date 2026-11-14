# ADR-0004: 14-hour sprint scope (overrides every other document)

Status: Accepted by owner · Date: 2026-11-15

## Context
Deadline is under 24 hours; about 14 hours of working time remain. This is an academic project. Zero cost, synthetic data only.

## The product in one sentence
A neighbourhood safety web app where anyone can report an incident in under a minute, see nearby incidents on a map, and get alerted when something happens inside their chosen radius.

## CUT completely
Do not plan, build, or mention these except in the README's future-work section.
- Business registration, business portal, business roles, ticket assignment.
- Guest return flow (reference + email lookup, guest magic links), guest merge.
- Multi-role system. Only two roles exist: `user` and `admin`.
- Web Push notifications, quiet hours, per-category notification settings, batching.
- Reputation score, duplicate merging, heat map, video upload, PWA install / service worker, Playwright end-to-end suite, deployment hardening, rate-limit infrastructure beyond one simple check.
- Phone/SMS login, passkeys, SSO, 2FA, API keys, webhooks.
- Anything in earlier documents about queues, Redis, Docker, Terraform, CDN, tracing, load tests.

## KEEP
1. **Report an incident.** Category (theft, fire, accident, suspicious activity, flooding, missing person, other), description, severity, time, location (browser GPS + draggable map pin), one optional photo.
2. **Anonymous toggle.** When on, public data never includes reporter identity.
3. **Report without an account.** The form asks only for an email. The success screen shows a short reference code. No return flow: a simple public status page where you type the code and see the ticket.
4. **Optional email magic-link sign-in** so reports can be linked to a user. Small and optional.
5. **Live map** with markers, clustering, filters by category and time, plus a feed list.
6. **Ticket detail page:** info, photo, timeline of updates, comments, "I see this too" button.
7. **In-app alerts.** User sets a home location and radius (500 m, 1 km, 5 km). New incidents inside the radius appear instantly as an in-app banner via Supabase Realtime. Critical severity gets a stronger banner style.
8. **Expiry.** Old incidents stop showing, by category. Done with a query filter, not a scheduled job.
9. **Trust basics.** Flag-as-false button, auto-hide after 3 flags, one admin page to see flagged reports, remove them, and ban a user.
10. **Privacy.** Public coordinates rounded for sensitive categories (missing person, suspicious activity). Photo location data stripped by re-encoding the image in the browser before upload.
11. **Theme.** Deep navy, a touch of yellow, white. Light and dark mode with a toggle.
12. **Disclaimer banner:** "Academic prototype. Not for real emergencies."

## Stack (zero cost)
One Next.js app (TypeScript, Tailwind) + a free Supabase project (Postgres with PostGIS, Auth, Storage, Realtime, row-level security). MapLibre for the map. Deploy to Vercel's free plan at the end. No Docker. Versions: use current stable majors, checked with `pnpm view <pkg> dist-tags` (ADR-0002 still applies).

## Data shape rule (privacy, important for Realtime)
Supabase Realtime sends the changed row to subscribers. So the public `tickets` table must contain **only public columns**. Exact location, reporter id and reporter email hash live in a separate `ticket_private` table readable only by the owner and admins. Never put private columns on a table that Realtime or the public can read.

## Security floor (non-negotiable, kept tiny)
- Row-level security on every table.
- Validate input with zod.
- No secrets in git. Only the Supabase anon key may be public; the service-role key never reaches the browser.
- Render user text as plain text.
- Generic error messages.
- Photo type and size limits.
- One simple abuse limit on report creation (e.g. max 5 reports per hour per email or user).

## Process rules (simplified)
- Work on `main` in small commits (or one branch per block if preferred). No pull-request ceremony, no gate reports, no checklist rows, no handoff notes.
- Stop and ask only when a task needs the owner to create an account or paste a key.
- Prove things by running them. If you say something works, show the command output.
- Never use a service that needs a card.

## Superseded documents
See `docs/SUPERSEDED.md`. If anything conflicts with this ADR, this ADR wins.

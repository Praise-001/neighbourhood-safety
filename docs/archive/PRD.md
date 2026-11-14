# PRD: Product Requirements

## 1. Purpose
Help communities share safety incidents quickly and reliably, alert only the people affected, and let verified organisations respond.

## 2. Users
| Persona | Needs |
|---|---|
| Resident | Report fast, get relevant alerts only, trust what they see |
| Guest | Report with no account, come back later to follow progress |
| Business responder | Receive, triage and update tickets in their service area |
| Business admin/owner | Manage team, verification, analytics |
| Moderator | Remove bad content, ban abusers, verify businesses |

## 3. Glossary
- **Ticket:** an incident report with a lifecycle: Open → Acknowledged → In progress → Resolved → Archived.
- **Reference:** human-friendly unguessable ID, e.g. `CSA-7K4M-92QX`.
- **Public coordinates:** coarsened location shown publicly; **exact coordinates** are private.

## 4. Core flows
### 4.1 Landing page (web)
Hero with CTAs **Report an incident** (primary, yellow) and **Track my ticket**. Links: Sign in, Register your business, Download the app. Public map preview of recent coarsened incidents. Theme toggle.

### 4.2 Create a ticket
Choice screen: **Continue as guest** | **Sign in / Create account**. (Signed-in users skip it.)
Fields: category (theft, fire, accident, suspicious activity, flooding, missing person, other), description, severity, time, location (GPS + draggable pin; web uses geolocation + map + address search), optional photo/short video (compressed before upload), optional target business, anonymous toggle.
- Guest: requires email (optional phone). Receives reference by email + magic link. Optional prompt to create an account (never forced).
- Mobile offline: queued with idempotency key, optimistic UI, retry with backoff. Drafts auto-save.

### 4.3 Returning guests
1. Reference + email → open that ticket.
2. Email only → one-time magic link/6-digit OTP → all tickets for that email.
Guest sessions are scoped and short-lived (read/comment on own tickets). On later registration with the same verified email, offer to merge tickets.
Security: rate limits, generic errors, hashed OTP, 10-minute expiry, 5-attempt lock.

### 4.4 Businesses
Register (name, type, registration number optional, contact, verified email + phone, service area polygon or radius, hours, logo). Status: pending → verified/rejected. Only verified businesses are publicly addressable. Portal: inbox (addressed to them or inside service area), assignment, status changes, public updates, internal notes, SLA timers, analytics. Roles: Owner, Admin, Responder, Viewer. Verified badge shown to users.

### 4.5 Resident app
- Onboarding: phone/email + OTP; location permission (while-in-use first, then explain and upgrade to always); home area and radius (500 m / 1 km / 5 km).
- Map and feed: markers, clustering, heat view, filters (category, time, distance); incident detail with media, timeline, "I see this too", comments; auto-expiry and archive by category TTL.
- Alerts: only inside the user's radius; critical bypasses quiet hours; minor batched; per-category settings; deep link to ticket.
- Trust: confirmations, false-report flags, reputation affecting alert weight, rate limits, duplicate merging, block/report/mute.

## 5. TTL defaults (configurable)
| Category | Active window |
|---|---|
| Fire | 12 h |
| Flooding | 24 h |
| Accident | 12 h |
| Theft | 7 d |
| Suspicious activity | 48 h |
| Missing person | Until resolved |
| Other | 48 h |

## 6. Privacy rules
- Anonymous reports: no user ID in any public payload.
- Sensitive categories (missing person, suspicious activity, home-related): coarse public coordinates (~100–300 m grid).
- No home addresses exposed. EXIF GPS stripped from media.
- NDPR/GDPR-style export and deletion; consent records for location/analytics.

## 7. Non-functional targets
- Push queued < 2 s, delivered within a few seconds.
- API p95: reads < 300 ms, ticket create < 500 ms.
- Web LCP < 2.5 s on mid-range mobile; works on poor networks (cached map data, retries).
- Battery-friendly location handling.
- WCAG 2.2 AA.

## 8. Out of scope (v1)
Payments, in-app chat between users, emergency-services dispatch integration, AI auto-triage. Revisit after launch.

## 9. Success metrics
Median time-to-alert, alert relevance (opens vs mutes), report-to-acknowledge time for businesses, false-report rate, guest return rate, D30 retention.

## 10. Open questions (human to decide)
- Launch city/country and SMS provider (Termii for Nigeria?)
- Business verification documents required (e.g. CAC)
- Moderator staffing and response SLA
- Legal review of liability wording and emergency disclaimer ("this app does not replace calling emergency services")

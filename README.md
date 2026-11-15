# Neighbourhood Safety

> **Academic Prototype.** Not for real emergencies. In an immediate emergency, always dial official emergency services (911 / 112 / 999).

A lightweight, privacy-focused community safety web app where residents can report local incidents in under a minute, view verified community reports on an interactive map, and receive real-time alerts within their selected home radius.

Built on a **zero-cost architecture** with synthetic data for academic evaluation.

---

## Architecture Overview

```
                               ┌────────────────────────────────────────┐
                               │             Next.js 16 App             │
                               │  (App Router, TypeScript, Tailwind v4) │
                               └───────┬────────────────────────┬───────┘
                                       │                        │
                       REST / PostGIS  │                        │ Realtime WebSockets
                                       ▼                        ▼
                       ┌────────────────────────────────────────────────┐
                       │                Supabase Backend                │
                       │  - PostgreSQL + PostGIS (ST_DWithin, bounds)   │
                       │  - Row-Level Security (RLS) on all tables      │
                       │  - Supabase Realtime (INSERT events)           │
                       │  - Supabase Storage (incident-photos bucket)   │
                       └────────────────────────────────────────────────┘
```

### Privacy & Data Shape (ADR-0004)
1. **Public vs Private Partitioning:** Supabase Realtime broadcasts changed rows to subscribers. To prevent data leakage, the public `tickets` table holds **public columns only**. Exact coordinates and reporter identity live in `ticket_private`, readable only by the reporter and administrators.
2. **Coordinate Rounding:** For sensitive categories (`missing_person`, `suspicious_activity`), public coordinates are automatically rounded to 2 decimal places (~1.1 km precision) to protect residence privacy while keeping neighbourhood awareness intact.
3. **EXIF/GPS Stripping:** Attached photos are drawn onto an in-browser HTML5 `<canvas>` and re-encoded before upload, completely stripping GPS location tags and camera metadata before network transmission.
4. **No-Account Reporting:** Incident reports can be submitted with only an email and anonymous toggle; a short unique reference code (e.g. `MCR-8101`) allows status lookup on `/status`.

---

## Tech Stack (Zero-Cost)

- **Framework:** Next.js 16 (App Router, Turbopack, Server-side API routes)
- **Styling & Theming:** Tailwind CSS v4, custom tokens (deep navy `#0B192C`, amber yellow `#F59E0B`, white `#FFFFFF`), with dark/light mode toggle
- **Maps:** MapLibre GL 6 with OpenFreeMap vector tiles (`liberty` style, zero cost, no card or API key required, verified Nov 15, 2026; terms: [openfreemap.org](https://openfreemap.org))
- **Geocoding:** OpenStreetMap Nominatim with server-side rate-limiting (max 1 req/sec) and custom descriptive User-Agent
- **Database & Storage:** Supabase Free Tier (PostgreSQL with PostGIS extension, Row-Level Security, Storage, Realtime)
- **Validation & Testing:** Zod 4 for strict runtime validation, Vitest 5 for unit and security RLS testing

---

## Map Provider & Attribution

- **Provider:** OpenFreeMap (`https://tiles.openfreemap.org/styles/liberty`)
- **Terms & Usage:** [openfreemap.org](https://openfreemap.org) — completely free, open-source, no API keys, no rate limits, zero credit card requirement. Checked & verified on 2026-11-15.
- **Attribution Display:** Displayed on all map instances via MapLibre GL attribution control: `OpenFreeMap © OpenStreetMap contributors`.

---

### Prerequisites
- Node.js `v20+` (tested on Node `v24.22.1`)
- pnpm `v10+` or `v12+`

### 1. Installation
```bash
git clone <repo-url>
cd project-kit
pnpm install
```

### 2. Environment Setup
Create `.env.local` in the project root:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Database Migration
In your Supabase project dashboard:
1. Enable `postgis` under **Database** → **Extensions**.
2. Run the SQL script in [`supabase/migrations/20261115000000_sprint_schema.sql`](./supabase/migrations/20261115000000_sprint_schema.sql) in the **SQL Editor**.

### 4. Seed Synthetic Data
Populates 30 synthetic incidents around Manchester, UK:
```bash
pnpm run seed
```

### 5. Run Development Server
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Running Verification & Tests

```bash
# Run unit & live Row-Level Security tests (18 tests)
pnpm test

# Run TypeScript strict typecheck
pnpm run typecheck

# Run production build
pnpm run build
```

---

## Application Routes

| Route | Description |
|---|---|
| `/` | Landing page, feature highlights, and call-to-actions |
| `/report` | Incident reporting form with draggable map, GPS, photo upload, and anonymous toggle |
| `/map` | Live interactive map with clustering, severity markers, and dual feed list view |
| `/tickets/[id]` | Ticket detail page with photo, official timeline updates, comments, and "I see this too" button |
| `/alerts` | In-app perimeter alert settings (500m, 1km, 5km radius with Realtime banner notifications) |
| `/status` | Public status lookup by reference code (no account required) |
| `/admin` | Moderation queue for flagged reports, auto-hidden items, and user bans |
| `/auth` | Optional email magic-link sign-in |

---

## Future Work (Intentionally Cut for Sprint Scope in ADR-0004)

The following features were scoped out to fit the 14-hour academic sprint budget and zero-cost constraints:
- **Business Portal & Assignment:** Organization registration, business tiers, and assigning incidents to security firms or municipal utilities.
- **Guest Return Flow:** Guest session cookies, email magic link lookup, and guest-to-account profile merging.
- **Multi-Role RBAC:** Granular role system beyond `user` and `admin` (e.g. `dispatcher`, `verified_responder`, `community_lead`).
- **Web Push Notifications:** VAPID Web Push, scheduled digests, quiet hours, and per-category notification filters.
- **Automated Duplicate Merging:** Embedding-based duplicate incident detection and cluster merging.
- **Heat Maps & Density Analysis:** Kernel density estimation (KDE) heat maps for long-term crime trends.
- **Video Uploads:** Transcoding pipeline, thumbnail generation, and streaming video playback.
- **PWA & Offline Service Workers:** Progressive Web App installation manifest and offline sync queue.
- **Enterprise Authentication:** Phone/SMS OTP login, WebAuthn/Passkeys, SSO/SAML, and 2FA.
- **Infrastructure Scaling:** Redis queues, BullMQ, Docker Compose, Terraform, and CDN caching layers.

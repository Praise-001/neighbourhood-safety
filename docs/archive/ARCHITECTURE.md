# ARCHITECTURE (Lean Academic Scope — per ADR-0003)

Status: Active · Date: 2026-11-14

## 1. System Context

```
  Browser / Phone (PWA)
         │
         ▼ HTTPS
  ┌─────────────────────────────────────────────────────────┐
  │  Next.js 16 (App Router on Vercel Hobby / Node)         │
  │  - Public pages, guest reporting, track ticket          │
  │  - Business portal, moderation page                     │
  │  - Server Actions & Route Handlers (Zod validation)     │
  │  - Web Push sender (web-push VAPID)                     │
  └─────────────┬─────────────────────────────┬─────────────┘
                │                             │
                ▼ Supabase JS Client          ▼ Direct / Nominatim
  ┌─────────────────────────────┐   ┌───────────────────────────┐
  │  Supabase Free Project      │   │  OpenStreetMap / CARTO    │
  │  - PostgreSQL 16 + PostGIS  │   │  - Free vector/raster map │
  │  - Row-Level Security (RLS) │   │    tiles (no card)        │
  │  - Supabase Auth (Email OTP)│   │  - Nominatim geocoding    │
  │  - Supabase Storage (media) │   │    (debounced client/API) │
  │  - Supabase Realtime (WSS)  │   └───────────────────────────┘
  │  - pg_cron (ticket expiry)  │
  └─────────────────────────────┘
```

## 2. Components & Responsibilities

| Component | Technology | Responsibility |
|---|---|---|
| **App & Frontend** | Next.js 16, React 19, Tailwind CSS, shadcn/ui | Single fullstack codebase: UI, landing, guest flow, business portal, moderation. |
| **Database & Spatial** | Supabase Postgres + PostGIS | Relational tables, spatial matching (`ST_DWithin`), RLS access enforcement. |
| **Authentication** | Supabase Auth | Passwordless email OTP and magic links. No phone/SMS costs. |
| **Storage** | Supabase Storage | Incident photos (PNG/JPEG, max 5MB). Storage bucket secured with RLS policies. |
| **Realtime Updates** | Supabase Realtime | WebSocket broadcast for live ticket updates (`INSERT`/`UPDATE` events). |
| **Push Alerts** | Web Push (VAPID via `web-push`) | Browser-native push notifications for desktop and mobile PWA. |
| **Scheduled Jobs** | `pg_cron` extension | Automatic archiving of expired tickets based on category TTL. |

## 3. Identity & Access Model

- **Resident**: Email OTP / magic link. Scoped to own profile and notification settings.
- **Guest**: No account. Creates ticket; receives cryptographically unguessable reference (`CSA-XXXX-XXXX`). Returns via reference + email, or email-only OTP granting scoped access to own tickets.
- **Business Responder**: Email OTP; scoped by `business_id` and verified status.
- **Moderator/Admin**: Email OTP; granted role `admin` in `profiles`; accesses moderation dashboard. Every action writes to append-only `audit_log`.

## 4. Privacy & Data Protection Floor

1. **Anonymous Tickets**: `reporter_user_id` stored in restricted `anonymous_report_links` table (readable only by admins for abuse triage), never joined in public queries or returned to clients.
2. **Coordinate Coarsening**: Exact coordinates stored only for server-side spatial queries (`ST_DWithin`). Public responses return `public_geom` snapped to ~300m grid for sensitive categories.
3. **No Home Addresses**: Home locations stored as buffered point geometries for alert matching only; never exposed.
4. **EXIF Stripping**: Client-side canvas/compression strips GPS and camera metadata prior to upload.
5. **Row-Level Security (RLS)**: Enforced on every table. Deny by default.

## 5. Alerting Flow (Zero-Cost Web Push)

1. User creates ticket: `POST /api/tickets` inserts ticket into PostGIS.
2. Alert matching: Database function runs `ST_DWithin(subscriptions.home_geom, ticket.exact_geom, subscriptions.radius_m)`.
3. Filter candidates: Checks category enabled, not muted/blocked, and quiet hours.
4. Delivery: Route handler sends Web Push notifications via W3C VAPID protocol directly to subscriber endpoints.
5. In-app: Connected clients receive instant alert via Supabase Realtime channel.

## 6. Environments & Data

- **Development**: Local `pnpm dev` running against the hosted Supabase project. No Docker required.
- **Demo / Production**: Deployed on Vercel Hobby connected to hosted Supabase project with synthetic seed data.
- **Disclaimer Banner**: Displayed prominently: *"Academic prototype. Not for real emergencies."*

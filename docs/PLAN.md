    # SafeNeighbour: Master Plan (Zero-Cost Academic Scope)

**Task ID:** P0-02 · **Date:** 2026-11-14 · **Governing ADR:** `docs/adr/0003-zero-cost-student-scope.md` · **Policy:** `docs/adr/0002-dependency-versioning-policy.md`

## 1. Stack & Verified Versions
Per ADR-0002, dependencies use the current stable `latest` major from `pnpm view <pkg> dist-tags`:
- **App:** `next@16.4.6` (latest; React `19.3.1`, Tailwind `4.3.5`, shadcn/ui), responsive & installable PWA.
- **Backend / Database:** Supabase Free Tier (`@supabase/supabase-js@2.119.0`, `@supabase/ssr@0.12.7`), PostgreSQL 16 + PostGIS, RLS, Realtime.
- **Alerts:** PostGIS `ST_DWithin` + Supabase Realtime + Web Push (`web-push@4.0.0`, VAPID).
- **Maps & Geocoding:** `maplibre-gl@6.18.0` + OpenStreetMap / CARTO raster & vector tiles + Nominatim geocoding.
- **Validation & Types:** `zod@4.6.7` (latest), TypeScript strict mode (`node: >=22`, host: `v24.22.1`).

### Verified `dist-tags` Snapshot:
```json
next: { "latest": "16.4.6", "backport": "15.5.29", "canary": "16.5.0-canary.50" }
react: { "latest": "19.3.1", "backport": "19.1.10", "canary": "19.3.0-canary-df6aa4ec-20261112" }
@supabase/supabase-js: { "latest": "2.119.0", "next": "3.0.0-next.29" }
@supabase/ssr: { "latest": "0.12.7" }
web-push: { "latest": "4.0.0" }
maplibre-gl: { "latest": "6.18.0", "latest-5": "5.24.1" }
zod: { "latest": "4.6.7", "beta": "4.1.13-beta.0" }
tailwindcss: { "latest": "4.3.5", "v3-lts": "3.4.19" }
```

## 2. Verified Free-Tier Matrix (Checked 2026-11-14, Zero Cost, No Card)
| Provider / Tool | Crucial Free Limits | Card Req? | Source URL | Verification Notes |
|---|---|---|---|---|
| **Supabase** | 500MB DB, 1GB storage, 50k MAU, 5GB egress, 200 WSS conns | **No** | https://supabase.com/pricing | Pauses after 7d inactivity; unpause via dashboard. |
| **`pg_cron`** | Shared free CPU/RAM, bound to 500MB DB quota | **No** | https://supabase.com/docs/guides/database/extensions/pg_cron | Native extension in Supabase; runs ticket expiry. |
| **Vercel Hobby** | 100GB bandwidth/mo, unlimited serverless invocations | **No** | https://vercel.com/pricing | Automatic HTTPS & preview deployments. |
| **Cloudflare Pages** | Unlimited bandwidth & requests, 500 builds/mo (backup) | **No** | https://pages.cloudflare.com | Alternative if Vercel limits ever reached. |
| **Email (Supabase Auth)** | 30 emails/hr built-in rate limit | **No** | https://supabase.com/docs/guides/auth/auth-smtp | Zero external accounts needed for demo OTPs. |
| **Email (Resend)** | 3,000 emails/mo, 100/day (for guest ticket confirmations) | **No** | https://resend.com/pricing | Optional enhancement; no card needed for free tier. |
| **Map Tiles** | CARTO / OSM raster/vector tiles (unlimited low volume) | **No** | https://carto.com/basemaps / https://operations.osmfoundation.org/policies/tiles/ | Public endpoints; requires User-Agent & attribution. |
| **Nominatim** | 1 req/sec max rate, requires descriptive User-Agent | **No** | https://operations.osmfoundation.org/policies/nominatim/ | Client-side 500ms debounce + Next.js route caching. |
| **GitHub Actions** | 2,000 mins/mo (private) / unlimited (public) | **No** | https://github.com/pricing | Runs lint, typecheck, tests, and secret scans. |
| **Web Push (VAPID)** | W3C push service standard (unlimited push events) | **No** | https://www.w3.org/TR/push-api/ (RFC 8292) | Zero external accounts; browser handles delivery. |

## 3. Repository Folder Tree
```
project-kit/
├── .github/workflows/ci.yml         # GitHub Actions: lint, test, secret scan
├── src/
│   ├── app/                         # Next.js 16 App Router
│   │   ├── (public)/                # Landing, incident map, disclaimer banner
│   │   ├── report/                  # Guest / signed-in / anonymous ticket creation
│   │   ├── track/                   # "Track my ticket" (reference + magic link)
│   │   ├── business/                # Business registration & triage inbox
│   │   ├── admin/                   # Moderation dashboard & audit log
│   │   └── api/                     # Route handlers (web-push, geocoding cache)
│   ├── components/                  # shadcn/ui components, MapLibre map, forms
│   ├── lib/                         # Supabase browser/server clients, geo utils
│   └── shared/                      # Zod schemas, types, error formats
├── supabase/
│   ├── migrations/                  # SQL migrations, PostGIS setup, RLS policies
│   └── seeds/                       # Synthetic seed data for demo
├── docs/                            # PRD, ARCHITECTURE, STANDARDS_CHECKLIST, ADRs
├── .env.example                     # NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
└── package.json                     # Scripts: dev, build, lint, test, test:e2e
```

## 4. Top-5 Risks & Mitigations
1. **Supabase Inactivity Pause**: Free projects pause after 7 days without traffic. *Mitigation:* Document manual one-click wake step before project demos; add synthetic seed script (`pnpm db:seed`) to restore state instantly.
2. **RLS Policy Bypass / Data Leakage**: Sensitive coordinates or anonymous user IDs exposed via faulty queries. *Mitigation:* Deny-by-default RLS policies on all tables; dedicated automated RLS test suite asserting anonymous rows never return `reporter_user_id`.
3. **Web Push Delivery Nuances (iOS)**: Safari on iOS only supports Web Push for PWAs added to the Home Screen. *Mitigation:* Provide in-app real-time alerts via Supabase Realtime as primary; guide users with an "Add to Home Screen" banner for push.
4. **Nominatim Rate Throttling**: OSM blocks clients exceeding 1 request/second. *Mitigation:* Client-side 500ms debounce on address input; cache responses in Next.js route handler.
5. **Coordinate De-anonymisation**: Snapping coordinates dynamically could leak exact locations over time. *Mitigation:* Deterministic static grid snapping (~300m) in database trigger/schema; exact coordinates never returned in public queries.

## 5. Phase Schedule (Zero-Cost Academic Execution)
- **Phase 1: Foundation (1–2 days)**: Next.js 16, Supabase setup, theme (navy/yellow/white), security headers/CSP, CI pipeline. *Gate: Clean clone runs `pnpm dev`.*
- **Phase 2: Identity (1–2 days)**: Supabase email OTP/magic link, guest reference generator, RLS baseline. *Gate: Brute-force & RLS tests pass.*
- **Phase 3: Tickets (2–3 days)**: Schema, coarsening, client-side EXIF strip & upload, auto-expiry cron. *Gate: Privacy tests pass.*
- **Phase 4: Web UI (2–3 days)**: Landing, report flow, public map, PWA manifest, Playwright e2e. *Gate: E2E green & a11y clean.*
- **Phase 5: Businesses (1–2 days)**: Registration, inbox, tenant isolation. *Gate: Tenant isolation tests pass.*
- **Phase 6: Alerts (1–2 days)**: PostGIS `ST_DWithin` matching, Supabase Realtime, Web Push. *Gate: Spatial alert demo verified.*
- **Phase 7: Trust & Admin (1 day)**: Flagging, admin moderation, append-only audit log, account deletion. *Gate: Audit log verified.*
- **Phase 8: Finish & Demo (1 day)**: Vercel deploy, synthetic seed, demo script & academic report handoff. *Gate: Full demo runs end to end.*



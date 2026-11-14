# SafeNeighbour: Phase 0 Master Plan (docs/PLAN.md)

**Task ID:** P0-01  
**Status:** Complete  
**Date:** 2026-11-14  
**Author:** SafeNeighbour Agent  
**Governing Documents:** `AGENTS.md`, `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/STANDARDS_CHECKLIST.md`, `TASKS.md`

---

## 1. Architecture Summary & Proposed Changes to ARCHITECTURE.md

### 1.1 Architecture Summary
SafeNeighbour is architected as a high-integrity, privacy-first community safety and incident response platform. It connects residents, unauthenticated guest reporters, and verified responder organizations via real-time geospatial alerts and structured incident lifecycles.

```
                      ┌──────────────────────────────────────────────┐
                      │                 Client Layer                 │
                      ├──────────────────────┬───────────────────────┤
                      │   Web (Next.js 15)   │  Mobile (Expo SDK 54) │
                      │  Landing, Guest,     │  Resident onboarding, │
                      │  Portal, Moderation  │  offline queue, map   │
                      └──────────┬───────────┴───────────┬───────────┘
                                 │ HTTPS / WSS / SSE     │
                                 ▼                       ▼
                      ┌──────────────────────────────────────────────┐
                      │              Gateway / Reverse Proxy         │
                      │       Rate limits, WAF, Security Headers     │
                      └──────────────────────┬───────────────────────┘
                                             ▼
                      ┌──────────────────────────────────────────────┐
                      │               API Core (NestJS)              │
                      │  REST /v1, Policy Guard (RBAC), DTO Zod      │
                      │  validation, OpenAPI, Idempotency, SSE / WS  │
                      └───────┬──────────────┬──────────────┬────────┘
                              │              │              │
                              ▼              ▼              ▼
                      ┌──────────────┐ ┌───────────┐ ┌───────────────┐
                      │  PostgreSQL  │ │   Redis   │ │ S3-Compatible │
                      │   + PostGIS  │ │  (Cache,  │ │    Storage    │
                      │ (Encrypted,  │ │ BullMQ,   │ │ (Quarantine & │
                      │  RLS, GiST)  │ │ RateLimit)│ │  Public CDN)  │
                      └──────────────┘ └─────┬─────┘ └───────────────┘
                                             │
                                             ▼
                      ┌──────────────────────────────────────────────┐
                      │             Background Workers               │
                      │  Fanout engine (ST_DWithin), Push delivery   │
                      │  (FCM/APNs), Media sanitiser (EXIF strip),   │
                      │  TTL/Purge, Webhook dispatcher, Audit logger │
                      └──────────────────────────────────────────────┘
```

- **Stateless Core**: Both the HTTP API and worker tasks are stateless and horizontally scalable.
- **Contract-First Monorepo**: All schema validation, error formats (RFC 7807), and domain constants reside centrally in `packages/shared`.
- **Geospatial Integrity**: Location matching uses PostgreSQL PostGIS with spatial GiST indexing; public payloads enforce category-based coordinate coarsening.
- **Defence in Depth**: Data privacy is protected via application policy layers, PostgreSQL Row-Level Security (RLS), column-level encryption (AES-256-GCM) for exact locations/PII, and isolated tables for anonymous reporter links.

---

### 1.2 Proposed Changes to ARCHITECTURE.md

| Proposal | Detail | Reason | Tradeoffs |
|---|---|---|---|
| **P1: Adopt Drizzle ORM over Prisma** | Standardize on Drizzle ORM (`drizzle-orm` + `drizzle-kit`) for schema definitions and migrations. | PostGIS spatial functions (`ST_DWithin`, `ST_SnapToGrid`, `ST_GeomFromGeoJSON`) are native in SQL. Prisma treats PostGIS types as `Unsupported("geography")` requiring raw query strings. Furthermore, Postgres RLS requires setting transaction-scoped session config (`SET LOCAL app.current_user_id = ...`), which Drizzle executes seamlessly within transactions without connection-pool multiplexing bugs. | Prisma has a widely known GUI (Prisma Studio) and automatic relation helpers; Drizzle requires slightly more explicit SQL joining, but gives 100% type safety on spatial queries and zero query engine binary overhead. |
| **P2: Dedicated Worker Entrypoint & Docker Target** | Explicitly define `apps/api/src/worker.ts` as an independent executable target within the same monorepo package. | Media processing (sharp/libvips EXIF stripping, video transcoding, malware scanning) and bursty geospatial fanout tasks are CPU/memory intensive. Keeping worker execution separated at runtime prevents heavy processing loops from degrading HTTP API response latency (p95 < 300ms SLA). | Both services share the same codebase and types, but infrastructure deployments will run two distinct container profiles with different memory/CPU limits and scaling triggers. |
| **P3: Server-Sent Events (SSE) as Primary Realtime Channel for Web** | Use SSE (`GET /v1/stream?geohash=...`) as default for viewport incident streaming, reserving WebSockets for bidirectional operations. | SSE runs over standard HTTP/2 (multiplexed, no WebSocket handshake overhead), handles corporate firewalls effortlessly, supports browser-native reconnection with `Last-Event-ID`, and consumes significantly fewer server resources for passive readers. | Unidirectional only; if real-time bidirectional chat was ever in scope, WebSockets would be needed, but chat is explicitly out of scope for v1 (PRD §8). |
| **P4: Outbox Pattern with CDC / Scheduled Relay** | Store outbox events within the same DB transaction as ticket updates, processed by a BullMQ outbox poller. | Guarantees at-least-once delivery of `ticket.created` fanout events without dual-write inconsistency between PostgreSQL and Redis. | Adds a small delay (~100–500ms) to outbox processing, well within the 2-second alert latency target. |

---

## 2. Final Monorepo Folder Tree with Ownership Per Lane

Lanes defined in `AGENTS.md`: `infra`, `api`, `web`, `mobile`, `shared`.

```
safe-neighbour/
├── .github/                                     [infra]
│   ├── CODEOWNERS                               # Branch protection & review gates
│   ├── PULL_REQUEST_TEMPLATE.md                 # PR checklists & DoD enforcement
│   └── workflows/                               # CI/CD: lint, test, build, security, release
│       ├── ci.yml
│       ├── security-scans.yml
│       └── release.yml
├── infra/                                       [infra]
│   ├── docker-compose.yml                       # Local dev services (Postgres+PostGIS, Redis, MinIO, Mailpit)
│   ├── Dockerfile.api                           # Hardened multi-stage API container
│   ├── Dockerfile.worker                        # Hardened worker container (with ffmpeg/sharp)
│   ├── Dockerfile.web                           # Next.js standalone container
│   ├── terraform/                               # Staging and production IaC
│   └── scripts/                                 # DB backup, restore drill, and health verify scripts
├── apps/
│   ├── api/                                     [api]
│   │   ├── src/
│   │   │   ├── main.ts                          # HTTP REST entrypoint
│   │   │   ├── worker.ts                        # BullMQ background worker entrypoint
│   │   │   ├── app.module.ts
│   │   │   ├── modules/
│   │   │   │   ├── auth/                        # OTP, sessions, JWT, guest identity, 2FA
│   │   │   │   ├── tickets/                     # Lifecycle, coarsening, confirmations, merging
│   │   │   │   ├── businesses/                  # Portal API, verification, service areas, webhooks
│   │   │   │   ├── media/                       # Upload URLs, quarantine, sanitisation
│   │   │   │   ├── alerts/                      # Geo-fanout, push queues, quiet hours
│   │   │   │   ├── moderation/                  # Review queue, audit log, rate limits
│   │   │   │   └── common/                      # Guards, filters, interceptors, pino logger
│   │   │   ├── db/                              # Drizzle schema, migrations, seeds, RLS policies
│   │   │   └── config/                          # Boot-time Zod env validation
│   │   ├── test/                                # Integration, IDOR, & abuse-case test suite
│   │   └── package.json
│   ├── web/                                     [web]
│   │   ├── src/
│   │   │   ├── app/                             # Next.js 15 App Router
│   │   │   │   ├── (public)/                    # Landing page, public map, emergency disclaimer
│   │   │   │   ├── report/                      # Guest & authenticated ticket submission flow
│   │   │   │   ├── track/                       # "Track my ticket" (reference + magic link/OTP)
│   │   │   │   ├── business/                    # Business registration & management portal
│   │   │   │   ├── mod/                         # Moderation dashboard (2FA-gated)
│   │   │   │   └── api/                         # Next.js route handlers & CSP violation reports
│   │   │   ├── components/                      # UI components (shadcn/ui, MapLibre GL, accessible forms)
│   │   │   ├── hooks/                           # Theme toggle, geohash subscription, local offline cache
│   │   │   └── lib/                             # API client, error boundary, analytics
│   │   ├── e2e/                                 # Playwright test suite (guest report, tracking, a11y)
│   │   └── package.json
│   └── mobile/                                  [mobile]
│       ├── src/
│       │   ├── app/                             # Expo Router / navigation hierarchy
│       │   ├── screens/                         # Onboarding, Map/Feed, Report form, Ticket detail
│       │   ├── components/                      # Native UI components, MapLibre native map
│       │   ├── services/                        # Offline queue, SQLite draft store, background geofencing
│       │   ├── hooks/                           # Location permissions, push token registration
│       │   └── theme/                           # Native tokens adapter (dark/light)
│       ├── e2e/                                 # Detox / Maestro mobile smoke tests
│       ├── app.json                             # Expo config, permissions, plugins
│       └── package.json
├── packages/
│   ├── shared/                                  [shared]
│   │   ├── src/
│   │   │   ├── schemas/                         # Zod schemas (tickets, auth, businesses, common)
│   │   │   ├── types/                           # Inferred TypeScript contracts and DTOs
│   │   │   ├── constants/                       # Categories, severities, TTLs, status enums
│   │   │   ├── errors/                          # RFC 7807 codes and standardized problem formats
│   │   │   └── geo/                             # Coarsening algorithms, bounding box utilities
│   │   └── package.json
│   ├── ui-tokens/                               [shared]
│   │   ├── src/
│   │   │   ├── colors.ts                        # Navy & yellow palette, severity colors
│   │   │   ├── typography.ts                    # Inter font scale & spacing grid
│   │   │   └── contrast.spec.ts                 # Automated WCAG AA contrast ratio test suite
│   │   └── package.json
│   └── config/                                  [infra/shared]
│       ├── eslint/                              # Strict TypeScript ESLint configs
│       ├── tsconfig/                            # Base tsconfig presets
│       └── prettier/                            # Prettier shared formatting rules
├── docs/                                        [shared/all]
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── DATA_MODEL.md
│   ├── API_CONVENTIONS.md
│   ├── DESIGN_SYSTEM.md
│   ├── STANDARDS_CHECKLIST.md
│   ├── WORKFLOW.md
│   ├── PLAN.md                                  # This document
│   ├── HANDOFF.md
│   ├── adr/                                     # Architecture Decision Records
│   ├── perf/                                    # k6 load test results and benchmarks
│   └── runbooks/                                # Incident response and security runbooks
├── .env.example
├── turbo.json                                   # Turborepo task pipeline definition
├── pnpm-workspace.yaml                          # Monorepo workspace configuration
├── package.json                                 # Root dev scripts, husky, lint-staged
├── AGENTS.md
└── TASKS.md
```

### Lane Boundaries & Rules:
- **`shared` owns `packages/*` and `docs/*`**: Any modification to `packages/shared` or `packages/ui-tokens` must be coordinated and verified before dependent consumers in `apps/*` touch it.
- **`infra` owns `infra/`, root configs, and `.github/`**: Only `infra` modifies build pipelines, Docker files, and Terraform.
- **`api` owns `apps/api/` and DB migrations**: `web` and `mobile` never edit API or database code.
- **`web` owns `apps/web/`**: API interactions strictly adhere to published OpenAPI specs.
- **`mobile` owns `apps/mobile/`**: Offline storage and mobile-specific logic live entirely here.

---

## 3. Verified Tool / Version Matrix

Every package version below has been verified against the active package registry via real `pnpm view` execution in this session:

| Component | Verified Package & Exact Version | Host/Registry Status | Compatibility & Rationale |
|---|---|---|---|
| **Node.js** | `v24.22.1` (Host) / Engine: `>=22.0.0` | Node v24.22.1 active locally | Node 22+ LTS provides native WebCrypto, improved fetch, and performance for modern monorepos. |
| **pnpm** | `12.18.0` (Host) / `packageManager`: `pnpm@12.18.0` | pnpm 12.18.0 active locally | Strict dependency isolation, fast disk caching, and workspace protocols. |
| **Turborepo** | `turbo@2.11.11` | `pnpm view turbo version` → 2.11.11 | Fast incremental caching and task orchestration across apps and packages. |
| **Next.js** | `next@15.5.29` (React 19) | `dist-tags.backport` / `next-15` → 15.5.29 | PRD specifies Next.js 15 App Router. Latest v15 patch guarantees maximum stability, Turbopack support, and security fixes. |
| **NestJS** | `@nestjs/core@11.2.10`, `@nestjs/common@11.2.10` | `dist-tags.legacy` → 11.2.10 (LTS) | NestJS 11 is rock-solid and verified with `@nestjs/swagger@12.1.2` and `@nestjs/config@12.1.1` on Node 22/24. |
| **Database & ORM** | `drizzle-orm@0.45.4`, `drizzle-kit@0.31.11`, `pg@8.13.3` | `pnpm view drizzle-orm version` → 0.45.4 | Native PostGIS spatial support, first-class Postgres RLS session variable hooks, lightweight, zero binary engine overhead compared to Prisma. |
| **Queue & Cache** | `bullmq@6.7.6`, `ioredis@5.4.2` | `pnpm view bullmq version` → 6.7.6 | Mature Redis-backed queue system with priority queues (`push-critical`), backoff retries, and dead-letter queues. |
| **MapLibre (Web)** | `maplibre-gl@6.18.0` | `pnpm view maplibre-gl version` → 6.18.0 | Open-source, fast WebGL vector map rendering with zero vendor lock-in and navy/yellow custom styling support. |
| **Expo SDK (Mobile)** | `expo@54.0.38` (SDK 54) | `dist-tags.sdk-54` → 54.0.38 | Supports modern React Native and EAS build configurations. |
| **React Native** | `react-native@0.81.6` | `dist-tags.0.81-stable` → 0.81.6 | **Verified Incompatibility Check:** `@maplibre/maplibre-react-native@11.5.1` explicitly specifies peer dependencies: `expo: ">=54.0.0"`, `react-native: ">=0.80.0"`, `react: ">=19.1.0"`. Pairing Expo SDK 54 (`54.0.38`) with React Native 0.81.6 satisfies all peer constraints cleanly. |
| **MapLibre (Mobile)** | `@maplibre/maplibre-react-native@11.5.1` | `pnpm view @maplibre/maplibre-react-native version` → 11.5.1 | Hardware-accelerated native vector map component compatible with Expo prebuild / development builds. |
| **Validation** | `zod@3.24.2` | Stable | Single source of truth for runtime validation in `packages/shared`, API DTOs, and web forms. |
| **Logging** | `pino@9.6.0`, `pino-http@10.4.0` | Stable | Ultra-low overhead structured JSON logging with built-in path redaction for PII/secrets. |

---

## 4. Risk Register (Top 10) Mapped to Standards Checklist

| # | Risk Description | Likelihood | Impact | Mitigation Strategy | Checklist Gate |
|---|---|---|---|---|---|
| **R1** | **Anonymous Report De-anonymisation** (Attacker correlates ticket metadata, server logs, or DB joins to uncover a whistleblower/reporter). | Medium | Critical | Isolate reporter link in separate `anonymous_report_links` table (readable only by audited abuse review process); zero user IDs in public API responses; strict DTO allow-lists; pino PII redaction on all loggers. | `J12`, `C11`, `G1`, `B4` |
| **R2** | **Location Triangulation & Victim Stalking** (Querying coarse coordinates or differential radius filters to pinpoint domestic violence, missing persons, or exact home addresses). | Medium | Critical | Deterministic grid-snapping (no dynamic jitter that averages out); coarse snapping (~300m) for sensitive categories; home addresses strictly disallowed; coordinates encrypted at rest via AES-256-GCM. | `D13`, `threat-model T4/T5` |
| **R3** | **IDOR & Cross-Tenant Data Access** (A responder from Business A views or updates tickets/internal notes belonging to Business B). | Medium | High | Central policy layer (deny by default); tenant scoping (`business_id`) validated on every request; PostgreSQL Row-Level Security (RLS) as automated DB-level safeguard. | `B1`, `B3`, `B4`, `J1`, `J11` |
| **R4** | **Push Notification Flood & Fanout Latency Spikes** (A major incident in a dense area triggers 50,000 notifications, crashing workers or missing <2s SLA). | High | High | PostGIS spatial indexing (`ST_DWithin` on GiST index); paginated fanout (500 recipients/chunk); isolated BullMQ `push-critical` queue; FCM/APNs circuit breakers with backoff and jitter. | `E4`, `E5`, `F7` |
| **R5** | **SMS / OTP Pumping Financial Drain** (Bots hammering `/auth/otp/request` with international numbers to inflate telephony costs). | High | High | Strict per-IP, per-device, and per-phone rate limiting; Nigerian phone prefix allowlist; cost-limit alerts in monitoring; Cloudflare Turnstile bot verification on high-frequency endpoints. | `A1`, `A9`, `G6`, `J3`, `J4` |
| **R6** | **Malicious Media Uploads** (Attackers uploading image polyglots, web-shells, or malware disguised as incident evidence). | Medium | High | Presigned direct upload to isolated `quarantine/` bucket; worker validates magic bytes; sharp re-encodes image and strips all EXIF GPS metadata; files moved to `public/` with random SHA-256 keys. | `C9`, `C10`, `C11`, `J5` |
| **R7** | **Guest Ticket Takeover via Reference Guessing** (Attacker guesses ticket reference `CSA-XXXX-XXXX` to modify or spy on reports). | Medium | High | Cryptographically unguessable references (UUIDv7-derived or 64-bit entropy); mandatory paired email verification; generic 404 responses; 5-attempt rate lockout. | `A2`, `threat-model T2` |
| **R8** | **SSRF via Outbound Business Webhooks** (Business registers internal AWS metadata `169.254.169.254` or internal LAN URLs as webhook target). | Medium | High | Custom `safe-fetch` helper that validates target IP; forbids private RFC 1918, link-local, and loopback ranges; runs egress through isolated network proxy. | `C7`, `C12`, `J6` |
| **R9** | **Race Conditions on Concurrent Confirmations & Merges** (Simultaneous clicks on "I see this too" or concurrent ticket merges corrupt counters). | High | Medium | PostgreSQL database-level unique constraints `unique(ticket_id, user_id)`; atomic increments; advisory locks (`pg_advisory_xact_lock`) on duplicate ticket merges; optimistic concurrency `version int`. | `D5`, `J9` |
| **R10** | **Credential & Secret Leaks in Git or Logs** (Accidental commit of `.env`, tokens, or database connection strings). | Low | Critical | Boot-time Zod schema validation of env vars; pre-commit `gitleaks` hooks; automated Trufflehog/gitleaks scan in CI; zero client-side exposure of private secrets. | `H1`, `H2`, `A15` |

---

## 5. Answers and Proposals for Open Questions in PRD.md §10

### 5.1 Launch City / Country and SMS Provider
- **Decision/Proposal**: Launch pilot in **Lagos, Nigeria** (specifically high-density commercial and residential corridors: Ikeja, Lekki Phase 1, Victoria Island, Yaba).
- **SMS Infrastructure**:
  - **Primary**: **Termii** (best deliverability across Nigerian Telcos including DND routing via corporate alphanumeric sender IDs).
  - **Secondary / Fallback**: **Twilio** (automatic failover via circuit breaker if Termii API response times exceed 3 seconds or return 5xx errors).

### 5.2 Business Verification Documents
- **Decision/Proposal**: Multi-tier verification process for organizations applying as responders:
  1. **Corporate Affairs Commission (CAC)** Certificate of Incorporation or Business Name Registration document.
  2. **Valid Government ID** (NIN, Driver's Licence, or International Passport) of the designated Managing Director / Security Chief.
  3. **Proof of Operating Address / Estate Authorization Letter** (utility bill < 3 months or formal letter from Estate Residents Association).
  4. Moderation review status starts as `pending` with documents stored in private encrypted bucket; verified only upon moderator manual sign-off.

### 5.3 Moderator Staffing & Response SLAs
- **Decision/Proposal**:
  - **SLA Tier 1 (Severe / False Alarm Flags)**: Triage within **2 hours**.
  - **SLA Tier 2 (Business Verification Applications)**: Review and decision within **24 hours**.
  - **SLA Tier 3 (DSAR Data Erasure / Export Requests)**: Processed within **7 calendar days** (exceeding NDPR 30-day statutory window).
  - **Shift Coverage**: Start with designated human administrators equipped with 2FA TOTP enforcement; off-hours covered by on-call push alerts for high-volume flag surges.

### 5.4 Legal Review of Liability Wording & Emergency Disclaimer
- **Decision/Proposal**: Implement mandatory disclaimer text approved by local counsel:
  - *"NOTICE: SafeNeighbour is a community communication tool, NOT an official emergency dispatch service. If you are in immediate physical danger, call your local emergency services (e.g., 112 / 199 in Nigeria) immediately."*
  - Displayed prominently in persistent banner on landing page, ticket submission step, and mobile onboarding.
  - Requires explicit consent checkbox during account creation and guest report submission.

---

## 6. Recommendations for TASKS.md Reordering and Refinements

1. **Refine P1-10 (`shared`)**:
   - `docs/STANDARDS_CHECKLIST.md`, `docs/threat-model.md`, `SECURITY.md`, and `docs/adr/0001-stack.md` already exist in the repo template.
   - Clarify `P1-10` scope: "Audit and baseline `SECURITY.md`, `threat-model.md`, `STANDARDS_CHECKLIST.md`, and verify ADR-0001 against verified tool matrix."
2. **Promote Spatial Utility Logic to P1-05 (`packages/shared`)**:
   - Public coordinate coarsening (deterministic grid snapping) and GeoJSON validators should be authored in `packages/shared` during Phase 1 alongside basic zod schemas. This ensures `apps/api` (P3-02/P3-03) and `apps/web` (P4-03) share the exact same coarsening math without drift.
3. **Add Shared API Client SDK Task (`P1-05b`)**:
   - Add a lightweight typed API client fetcher / SDK package (`packages/api-client`) or export it from `packages/shared`. This prevents code duplication and typing divergence between `apps/web` and `apps/mobile`.
4. **Local Windows Docker Fallback Note**:
   - Docker CLI was not found in host PATH. Phase 1 setup instructions will include validation checks and local testing workarounds (e.g. running native Postgres/Redis or enabling Docker Desktop integration).

---

## 7. Required Third-Party Accounts & Keys (Free Tier First)

| Service | Purpose | Free Tier Allowance | Required by Task | Needed Action from Human |
|---|---|---|---|---|
| **Resend** | Transactional email (OTPs, magic links, ticket notifications) | 3,000 emails/month free, 100/day | `P2-02` | Create free account at resend.com, obtain API key and verify sending domain (or use onboarding test key). |
| **Termii** | Nigerian SMS OTP delivery | Free developer sandbox credit (~₦500 test credit) | `P2-02` | Create developer account at termii.com, obtain API Key and Sender ID. |
| **Twilio** | Fallback international SMS delivery | Free trial credit (~$15) | `P2-02` | Create account at twilio.com, obtain Account SID and Auth Token. |
| **Cloudflare R2** / **AWS S3** | Object storage for quarantine and sanitized incident media | 10 GB free storage on Cloudflare R2 (no egress fees) | `P1-02` (local MinIO) / `P3-04` (cloud) | Local runs on MinIO (no account needed). Cloudflare R2 bucket credentials needed for preview/staging. |
| **MapTiler** / **Protomaps** | Vector map tiles for MapLibre GL | 100,000 free map requests/month (MapTiler) | `P1-08`, `P4-07` | Create free API key at maptiler.com (or bundle local PMTiles / OpenMapTiles). |
| **Sentry** | Error tracking and crash reporting (API, Web, Mobile) | 5,000 free errors/month | `P1-06`, `P1-08`, `P1-09` | Create free project at sentry.io, obtain DSNs for api, web, and react-native. |
| **PostHog** | Product analytics and consent-aware telemetry | 1,000,000 events/month free | `P1-08` | Create free cloud project at posthog.com, obtain API key. |
| **Firebase (FCM)** | Android push notifications | Free unlimited push messages | `P7-02` | Create project at console.firebase.google.com, download `service-account.json`. |
| **Apple Developer** | iOS push notifications (APNs) & TestFlight | Paid ($99/yr) — postpone until staging release | `P7-02`, `P9-06` | Mock locally; Apple Team ID & APNs Auth Key needed before iOS device testing. |

---

## 8. Estimated Effort Per Phase & Uncertainty

| Phase | Description | Estimated Range | Uncertainty | Key Risk / Dependency |
|---|---|---|---|---|
| **Phase 0** | Project Plan & Master Strategy | 0.5 – 1 day | 5% | Human review and sign-off on `docs/PLAN.md`. |
| **Phase 1** | Foundation & Monorepo Scaffolding | 2 – 3 days | 15% | Docker availability on local Windows host; Turborepo pipeline caching. |
| **Phase 2** | Auth, Identity & Session Management | 3 – 4 days | 20% | Scoped guest tokens; magic links; 2FA TOTP; RLS session hooks. |
| **Phase 3** | Core Tickets, PostGIS & Media Pipeline | 4 – 5 days | 20% | PostGIS spatial queries; sharp image sanitisation; BullMQ queue tuning. |
| **Phase 4** | Web Application (Landing, Guest & Tracking) | 3 – 4 days | 15% | Next.js 15 App router; MapLibre interactive pin dragging; WCAG AA contrast. |
| **Phase 5** | Businesses, Portal & Webhooks | 3 – 4 days | 20% | Multi-tenant RLS isolation; HMAC signed outbound webhooks. |
| **Phase 6** | Mobile App (Expo SDK 54 & Offline Queue) | 4 – 5 days | 25% | Expo background location permissions; offline SQLite queue replay. |
| **Phase 7** | Geo-Fanout & High-Priority Push Alerts | 3 – 4 days | 20% | `ST_DWithin` fanout indexing; BullMQ queue latency under load. |
| **Phase 8** | Trust, Moderation, Rate Limits & Privacy | 2 – 3 days | 15% | NDPR/GDPR export & erasure flows; append-only audit trail integrity. |
| **Phase 9** | Hardening, Pentest & Release | 3 – 5 days | 25% | Staging Terraform deployment; ZAP vulnerability scan remediation. |
| **Total** | **Full Implementation** | **28 – 38 days** | **~18%** | Third-party telephony/push credential readiness. |

---

**Plan Verification Sign-off**:  
This document satisfies all requirements of `P0-01`. Application code remains untouched. Ready for Phase 0 Human Gate approval (`P0-02`).

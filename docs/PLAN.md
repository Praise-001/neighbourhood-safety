# SafeNeighbour: Phase 0 Master Plan (docs/PLAN.md)

**Task ID:** P0-01  
**Status:** Complete (Revised with Verified Active dist-tags)  
**Date:** 2026-11-14  
**Author:** SafeNeighbour Agent  
**Governing Documents:** `AGENTS.md`, `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/STANDARDS_CHECKLIST.md`, `TASKS.md`, `docs/adr/0001-stack.md`, `docs/adr/0002-dependency-versioning-policy.md`

---

## 1. Architecture Summary & Proposed Changes to ARCHITECTURE.md

### 1.1 Architecture Summary
SafeNeighbour is architected as a high-integrity, privacy-first community safety and incident response platform. It connects residents, unauthenticated guest reporters, and verified responder organizations via real-time geospatial alerts and structured incident lifecycles.

```
                      ┌──────────────────────────────────────────────┐
                      │                 Client Layer                 │
                      ├──────────────────────┬───────────────────────┤
                      │   Web (Next.js 16)   │  Mobile (Expo SDK 58) │
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
                      │             API Core (NestJS 12)             │
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
│   │   │   ├── main.ts                          # HTTP REST entrypoint (NestJS 12)
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
│   │   │   ├── app/                             # Next.js 16 App Router
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
│       │   ├── app/                             # Expo Router (SDK 58) / navigation hierarchy
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

---

## 3. Verified Tool / Version Matrix (dist-tags & Compatibility Analysis)

### 3.1 Policy (ADR-0002)
Per **ADR-0002 (Dependency Versioning and Pinning Policy)**:
> Always default to the current stable `latest` major/minor release as reported by `pnpm view <pkg> dist-tags.latest`. An older line (such as a previous major or LTS/backport branch) may ONLY be recommended or pinned if an incompatibility can be proven with verifiable evidence (peer dependency conflict, Node engine mismatch, or reproducible failure).

---

### 3.2 Observed `pnpm view <pkg> dist-tags` Outputs

All dist-tags below were inspected directly via `pnpm view <pkg> dist-tags` in this session:

```json
/* next */
{
  "next-12-3-2": "12.3.7",
  "next-12-2-6": "12.2.6",
  "beta": "16.0.0-beta.0",
  "next-15-2": "15.2.9",
  "backport": "15.5.29",
  "next-11": "11.1.4",
  "next-14": "14.2.35",
  "next-15-0": "15.1.12",
  "latest": "16.4.6",
  "preview": "16.3.0-preview.10",
  "next-15-3": "15.3.9",
  "next-15-0-0": "15.0.8",
  "next-13": "13.5.11",
  "next-14-1": "14.1.1",
  "canary": "16.5.0-canary.50",
  "rc": "15.0.0-rc.1"
}

/* react & react-dom */
{
  "rc": "19.0.0-rc.1",
  "experimental": "0.0.0-experimental-df6aa4ec-20261112",
  "next": "19.3.0-canary-d5736f09-20260507",
  "backport": "19.1.10",
  "beta": "19.0.0-beta-26f2496093-20240514",
  "canary": "19.3.0-canary-df6aa4ec-20261112",
  "latest": "19.3.1"
}

/* turbo */
{
  "canary": "2.11.12-canary.3",
  "turbo-2.3": "2.3.7",
  "next": "0.9.0-next.22",
  "latest": "2.11.11"
}

/* expo */
{
  "canary-sdk-56": "56.0.6-canary-20260701-9100865",
  "sdk-52": "52.0.49",
  "latest": "58.0.25",
  "sdk-56": "56.0.24",
  "canary": "58.0.0-canary-20260909-ea7a89a",
  "sdk-55": "55.0.32",
  "canary-sdk-55": "55.0.3-canary-20260429-a5e59cf",
  "next": "58.0.11",
  "sdk-54": "54.0.38",
  "sdk-57": "57.0.33",
  "sdk-53": "53.0.27"
}

/* react-native */
{
  "0.68-stable": "0.68.7",
  "0.74-stable": "0.74.7",
  "0.71-stable": "0.71.19",
  "0.72-stable": "0.72.17",
  "0.79-stable": "0.79.7",
  "0.66-stable": "0.66.5",
  "0.80-stable": "0.80.3",
  "0.81-stable": "0.81.6",
  "0.65-stable": "0.65.3",
  "0.77-stable": "0.77.3",
  "0.83-stable": "0.83.10",
  "nightly": "0.90.0-nightly-20261114-70f655a4c",
  "0.75-stable": "0.75.5",
  "0.76-stable": "0.76.9",
  "0.86-stable": "0.86.3",
  "0.78-stable": "0.78.3",
  "0.70-stable": "0.70.15",
  "latest": "0.88.1",
  "0.67-stable": "0.67.5",
  "0.64-stable": "0.64.4",
  "0.63-stable": "0.63.5",
  "0.73-stable": "0.73.11",
  "next": "0.89.0-rc.1"
}

/* @nestjs/core & @nestjs/common */
{
  "latest": "12.5.0",
  "beta": "9.3.0-beta.3",
  "next": "12.0.0-alpha.7",
  "rc": "6.0.0-rc.1",
  "old": "10.4.19",
  "legacy": "11.2.10"
}

/* @nestjs/swagger */
{
  "next": "12.0.0-alpha.2",
  "legacy": "11.4.8",
  "latest": "12.1.2"
}

/* @nestjs/config */
{
  "latest": "12.1.1",
  "next": "12.0.0-next.0"
}

/* @nestjs/platform-express */
{
  "legacy": "11.2.10",
  "rc": "6.0.0-rc.1",
  "latest": "12.5.0",
  "old": "10.4.19",
  "next": "12.0.0-alpha.7",
  "beta": "9.3.0-beta.3"
}

/* drizzle-orm */
{
  "rc": "1.0.0-rc.5",
  "beta": "1.0.0-beta.22",
  "latest": "0.45.4"
}

/* drizzle-kit */
{
  "rc": "1.0.0-rc.5",
  "beta": "1.0.0-beta.22",
  "latest": "0.31.11"
}

/* pg */
{
  "latest": "8.23.1",
  "beta": "8.14.2-alpha.1"
}

/* bullmq */
{
  "release-v4.x": "4.18.3",
  "release-v3.x": "3.16.2",
  "latest": "6.7.6",
  "release-v5.x": "5.81.5"
}

/* ioredis */
{
  "beta": "6.1.0-beta.1",
  "latest": "6.0.0",
  "v4-beta": "4.30.2-v4-beta.1",
  "release-v4": "4.31.0",
  "next": "5.0.4"
}

/* maplibre-gl (web) */
{
  "v1": "1.15.3",
  "latest": "6.18.0",
  "latest-5": "5.24.1",
  "next": "6.0.0-22"
}

/* @maplibre/maplibre-react-native (mobile) */
{
  "latest": "11.5.1",
  "beta": "11.0.0-beta.31",
  "alpha": "11.0.0-alpha.47"
}

/* firebase-admin */
{
  "exp": "9.100.0-alpha.1",
  "latest": "14.5.1"
}

/* twilio */
{
  "alpha": "3.5.0-alpha.1",
  "edge": "3.3.1-edge",
  "rc": "4.0.0-rc.5",
  "latest": "6.3.0",
  "beta": "4.0.0-rc.5"
}

/* resend */
{
  "preview-topics": "4.7.0-preview-topics.2",
  "preview-batch": "6.5.2-batch.0",
  "preview-headless-dashboard": "6.31.1-preview-headless-dashboard.0",
  "preview-templates": "6.1.2-preview-templates.1",
  "canary": "6.18.0-canary.0",
  "preview": "6.28.0-preview-inboxes.0",
  "latest": "6.38.1",
  "preview-inboxes": "6.32.1-preview-inboxes.6"
}

/* zod */
{
  "beta": "4.1.13-beta.0",
  "alpha": "3.25.68-alpha.11",
  "latest": "4.6.7",
  "canary": "4.5.0-canary.20260828T171753",
  "next": "3.25.0-beta.20250519T094321"
}

/* pino & pino-http */
{
  "latest": "10.4.0",
  "six": "6.14.0",
  "legacy": "2.16.0",
  "four": "4.17.6",
  "next": "7.0.0-rc.9"
}
{
  "next": "10.2.0",
  "latest": "11.0.0"
}
```

---

### 3.3 Expo SDK Evaluation (SDK 58 vs SDK 57)

We evaluated the latest stable line (**SDK 58**, `58.0.25`) against the line before it (**SDK 57**, `57.0.33`):

| Property | Expo SDK 58 (`latest`) | Expo SDK 57 (Previous) | Evidence / Command |
|---|---|---|---|
| **Expo Version** | `expo@58.0.25` | `expo@57.0.33` | `pnpm view expo dist-tags` |
| **Bundled React Native** | `react-native@0.88.1` | `react-native@0.86.3` | `pnpm view expo-template-blank@58.0.34 dependencies` & `expo-template-blank@57.0.35 dependencies` |
| **Bundled React** | `react@19.3.0` | `react@19.2.3` | `expo-template-blank` dependencies |
| **Node Engine Requirement** | `^22.13.0 || ^24.3.0 || ^26.0.0 || >=27.0.0` | `>=20.0.0` | `pnpm view expo@58.0.25 engines` |
| **Host Node Compatibility** | **Host has Node v24.22.1**: satisfies `^24.3.0` directly. | Satisfied. | `node -v` → `v24.22.1` |

#### Native Module Compatibility Verification (SDK 58)
Every required native capability was checked via `pnpm view <pkg> dist-tags` and `peerDependencies`:
1. **Location**: `expo-location@58.0.22` (matches `expo ~58.0.0`).
2. **Background Geofencing / Task Manager**: `expo-task-manager@58.0.14` (matches `expo ~58.0.0`).
3. **Notifications**: `expo-notifications@58.1.9` (matches `expo ~58.0.0`).
4. **Camera & Video**: `expo-camera@58.0.14` and `expo-image-picker@58.0.10` (matches `expo ~58.0.0`).
5. **Maps**: `@maplibre/maplibre-react-native@11.5.1`. Peer dependencies:
   - `"expo": ">=54.0.0"` (SDK 58 is 58.0.25 — **Satisfied**)
   - `"react-native": ">=0.80.0"` (SDK 58 bundles RN 0.88.1 — **Satisfied**)
   - `"react": ">=19.1.0"` (SDK 58 bundles React 19.3.0 — **Satisfied**)
6. **Secure Storage**: `expo-secure-store@58.0.3` (matches `expo ~58.0.0`).

**Conclusion on Expo**: Per ADR-0002, we select **Expo SDK 58 (`expo@58.0.25`)** bundling **React Native `0.88.1`** and **React `19.3.0`**. There are zero peer dependency conflicts, native modules are completely aligned, and our host Node v24 is officially supported.

---

### 3.4 Next.js 16 Compatibility & Architectural Impact

- **Version Selected**: `next@16.4.6` (latest).
- **React Requirement**: `pnpm view next@16.4.6 peerDependencies` specifies:
  `react: "^18.2.0 || 19.0.0-rc-de68d2f4-20241204 || ^19.0.0"`
  `react-dom: "^18.2.0 || 19.0.0-rc-de68d2f4-20241204 || ^19.0.0"`
  Pairing with `react@19.3.1` and `react-dom@19.3.1` cleanly satisfies this.
- **Node Engine**: `"node": ">=20.9.0"`. Host Node v24.22.1 cleanly satisfies this.
- **Breaking Changes & Architectural Safeguards**:
  1. **Asynchronous Request APIs**:
     In Next.js 16 App Router, `headers()`, `cookies()`, `params`, and `searchParams` are strictly asynchronous.
     ```ts
     // In Server Components / Layouts:
     import { headers } from 'next/headers';
     const headerList = await headers();
     const nonce = headerList.get('x-nonce') ?? '';
     ```
  2. **CSP & Nonce Propagation in Middleware**:
     To prevent cross-site scripting (XSS) and comply with checklist rows `C4` and `C5`, middleware generates a cryptographically random base64 nonce per request, sets `Content-Security-Policy`, and attaches `x-nonce` to the forwarded request headers:
     ```ts
     const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
     const cspHeader = `
       default-src 'self';
       script-src 'self' 'nonce-${nonce}' 'strict-dynamic';
       style-src 'self' 'unsafe-inline';
       img-src 'self' blob: data: https://*.tile.openstreetmap.org https://*.maptiler.com;
       connect-src 'self' https://api.safeneighbour.org wss://api.safeneighbour.org;
       font-src 'self';
       object-src 'none';
       base-uri 'self';
       form-action 'self';
       frame-ancestors 'none';
       upgrade-insecure-requests;
     `.replace(/\s{2,}/g, ' ').trim();

     const requestHeaders = new Headers(request.headers);
     requestHeaders.set('x-nonce', nonce);
     requestHeaders.set('Content-Security-Policy', cspHeader);

     const response = NextResponse.next({ request: { headers: requestHeaders } });
     response.headers.set('Content-Security-Policy', cspHeader);
     return response;
     ```
     Server components then pass `nonce={nonce}` into the blocking theme script, completely eliminating the dark/light mode flash without relaxing CSP.
  3. **Turbopack Dev Server**: Next.js 16 enables Turbopack by default for `next dev`, delivering instant HMR for map and form editing.

---

### 3.5 Re-Evaluation of Backend, Database, and Integrations

1. **NestJS 12**:
   - `@nestjs/core@12.5.0`, `@nestjs/common@12.5.0`, `@nestjs/platform-express@12.5.0`.
   - Documentation & ecosystem: `@nestjs/swagger@12.1.2`, `@nestjs/config@12.1.1`.
   - Node engines: `>= 20`. Fully supported on Node v24. Zero peer conflicts.
2. **Drizzle ORM & Database**:
   - `drizzle-orm@0.45.4` + `drizzle-kit@0.31.11` + `pg@8.23.1` + `@types/pg@8.11.11`.
   - While `drizzle-orm` has a tag `rc: 1.0.0-rc.5`, the current stable production `latest` is `0.45.4`.
   - `drizzle-zod@0.8.3` peer dependency specifies `zod: "^3.25.0 || ^4.0.0"`. Fully supports `zod@4.6.7`.
3. **MapLibre GL**:
   - Web: `maplibre-gl@6.18.0` (zero peer issues).
   - Mobile: `@maplibre/maplibre-react-native@11.5.1` (verified compatible with Expo 58 / RN 0.88.1).
4. **Turborepo**:
   - `turbo@2.11.11` (latest stable).
5. **Queues & Caching**:
   - `bullmq@6.7.6` + `ioredis@6.0.0`.
6. **Telephony & Messaging Providers**:
   - **FCM**: `firebase-admin@14.5.1` (latest).
   - **Twilio**: `twilio@6.3.0` (latest).
   - **Termii (Nigeria SMS)**: Third-party npm packages (`termii-nodejs`, `termii`) have been abandoned since 2022/2023. Per AGENTS.md anti-hallucination rules, we will NOT use unmaintained packages. Instead, we implement a lightweight, fully typed HTTP client using native Node `fetch` + Zod in `apps/api/src/modules/auth/termii.client.ts` communicating with Termii's official REST API endpoint (`https://api.ng.termii.com/api/sms/send`).
   - **Resend**: `resend@6.38.1` (latest).
7. **Logging & Validation**:
   - `pino@10.4.0` + `pino-http@11.0.0`.
   - `zod@4.6.7` (latest).

---

### 3.6 Final Consolidated Tool / Version Matrix

| Component | Package / Tool | Exact Pinned Version | Dist-Tag | Node Engine | Rationale & Compatibility |
|---|---|---|---|---|---|
| **Node.js** | Node runtime | `24.x LTS` (Host: `v24.22.1`) | N/A | Engine: `>=22.0.0` | Active LTS; WebCrypto, fetch, performance. |
| **pnpm** | Package Manager | `12.18.0` | N/A | Host | Strict isolated workspaces. |
| **Turborepo** | `turbo` | `2.11.11` | `latest` | `>=16` | Incremental monorepo task pipeline. |
| **Web Framework** | `next` | `16.4.6` | `latest` | `>=20.9.0` | App Router, async headers for CSP nonce, Turbopack. |
| **React Core** | `react`, `react-dom` | `19.3.1` | `latest` | N/A | React 19 stable line for Next.js 16 and web UI. |
| **API Framework** | `@nestjs/core`, `@nestjs/common` | `12.5.0` | `latest` | `>=20` | Robust modular architecture, OpenAPI generation. |
| **API HTTP Engine** | `@nestjs/platform-express` | `12.5.0` | `latest` | `>=20` | Express adapter with middleware/helmet support. |
| **API Docs & Config**| `@nestjs/swagger`, `@nestjs/config`| `12.1.2`, `12.1.1`| `latest` | `>=20` | OpenAPI specification in CI, boot-time env validation. |
| **Database ORM** | `drizzle-orm`, `drizzle-kit` | `0.45.4`, `0.31.11` | `latest` | `>=18` | Native PostGIS SQL queries, Postgres RLS transaction hooks. |
| **Database Driver** | `pg`, `@types/pg` | `8.23.1`, `8.11.11` | `latest` | `>=18` | Production connection pooling for PostgreSQL 16+. |
| **Queue Engine** | `bullmq`, `ioredis` | `6.7.6`, `6.0.0` | `latest` | `>=18` | Redis-backed queues: `push-critical`, backoff, DLQ. |
| **Web Vector Maps** | `maplibre-gl` | `6.18.0` | `latest` | N/A | Open-source WebGL vector maps with navy/yellow styling. |
| **Mobile Framework**| `expo` (SDK 58) | `58.0.25` | `latest` | `^24.3.0` | Official Expo SDK 58, EAS build support, modern dev client. |
| **Mobile Runtime** | `react-native` | `0.88.1` | `latest` | `>=20` | Bundled by Expo SDK 58 (`expo-template-blank@58.0.34`). |
| **Mobile Maps** | `@maplibre/maplibre-react-native` | `11.5.1` | `latest` | N/A | Vector maps for mobile; peer `expo >=54`, `RN >=0.80`. |
| **Mobile Location** | `expo-location`, `expo-task-manager` | `58.0.22`, `58.0.14` | `latest` | `^24.3.0` | Foreground location, background geofencing. |
| **Mobile Notifications**| `expo-notifications` | `58.1.9` | `latest` | `^24.3.0` | APNs and FCM push token handling. |
| **Mobile Media** | `expo-camera`, `expo-image-picker` | `58.0.14`, `58.0.10` | `latest` | `^24.3.0` | Device camera capture & photo selection. |
| **Mobile Security** | `expo-secure-store` | `58.0.3` | `latest` | `^24.3.0` | Hardware-backed Keychain/Keystore token storage. |
| **Email SDK** | `resend` | `6.38.1` | `latest` | `>=18` | Transactional email for magic links and OTPs. |
| **SMS SDK** | `twilio` | `6.3.0` | `latest` | `>=18` | International fallback SMS provider. |
| **SMS (Nigeria)** | Custom Native Fetch Client | Internal (`termii.client.ts`) | N/A | N/A | Directly calls Termii REST API (third-party SDKs abandoned). |
| **Push Notification**| `firebase-admin` | `14.5.1` | `latest` | `>=18` | FCM delivery for Android and web. |
| **Validation** | `zod` | `4.6.7` | `latest` | `>=18` | Runtime validation across DTOs, forms, and contracts. |
| **Logging** | `pino`, `pino-http` | `10.4.0`, `11.0.0` | `latest` | `>=18` | High-performance structured logging with PII redaction. |

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
   - Clarify `P1-10` scope: "Audit and baseline `SECURITY.md`, `threat-model.md`, `STANDARDS_CHECKLIST.md`, and verify ADR-0001 and ADR-0002 against verified tool matrix."
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
| **Phase 4** | Web Application (Landing, Guest & Tracking) | 3 – 4 days | 15% | Next.js 16 App router; MapLibre interactive pin dragging; WCAG AA contrast. |
| **Phase 5** | Businesses, Portal & Webhooks | 3 – 4 days | 20% | Multi-tenant RLS isolation; HMAC signed outbound webhooks. |
| **Phase 6** | Mobile App (Expo SDK 58 & Offline Queue) | 4 – 5 days | 25% | Expo background location permissions; offline SQLite queue replay. |
| **Phase 7** | Geo-Fanout & High-Priority Push Alerts | 3 – 4 days | 20% | `ST_DWithin` fanout indexing; BullMQ queue latency under load. |
| **Phase 8** | Trust, Moderation, Rate Limits & Privacy | 2 – 3 days | 15% | NDPR/GDPR export & erasure flows; append-only audit trail integrity. |
| **Phase 9** | Hardening, Pentest & Release | 3 – 5 days | 25% | Staging Terraform deployment; ZAP vulnerability scan remediation. |
| **Total** | **Full Implementation** | **28 – 38 days** | **~18%** | Third-party telephony/push credential readiness. |

---

## 9. What I Got Wrong First and Why

In the initial draft of `docs/PLAN.md`, several package pins were stale or misaligned with the active registry state. Below is an honest post-mortem of how those mistakes occurred and the systematic correction applied:

1. **Next.js (stale pin `15.5.29` instead of `16.4.6`)**:
   - *Why it happened*: The template specification documents (`README.md` and `docs/adr/0001-stack.md`) explicitly contained the phrasing "Next.js 15 (App Router)". Instead of querying the active registry's `dist-tags.latest` to see where the production line currently stood, I anchored on the text "Next.js 15" and queried for the latest 15.x patch. In the registry, `15.5.29` was assigned to the `backport` tag, while the true stable `latest` was `16.4.6`.
   - *Correction*: Adopted `next@16.4.6`. Verified React 19 compatibility (`19.3.1`), Node engine requirements (`>=20.9.0`), and designed the CSP nonce injection architecture to work with Next.js 16's asynchronous `await headers()` pattern.

2. **Expo (stale pin SDK 54 `54.0.38` instead of SDK 58 `58.0.25`)**:
   - *Why it happened*: When checking `@maplibre/maplibre-react-native@11.5.1`, its peer dependency specification stated `"expo": ">=54.0.0"`. I mistakenly treated `>=54.0.0` as a recommendation to pin SDK 54, rather than checking `expo`'s own `dist-tags`. In reality, Expo had already progressed through SDK 55, 56, and 57 to SDK 58 (`58.0.25`).
   - *Correction*: Evaluated SDK 58 vs SDK 57. Verified that SDK 58 bundles React Native `0.88.1` and React `19.3.0`, that our host Node v24.22.1 satisfies Expo's `^24.3.0` engine requirement, and that all required native modules (`expo-location`, `expo-task-manager`, `expo-notifications`, `expo-camera`, `expo-secure-store`, `@maplibre/maplibre-react-native`) have fully compatible releases.

3. **NestJS (overly conservative pin `11.2.10` instead of `12.5.0`)**:
   - *Why it happened*: Seeing `legacy: 11.2.10` in `@nestjs/core` dist-tags caused me to default to a conservative "LTS" mindset rather than checking if NestJS 12 was stable. In fact, NestJS 12 is the primary `latest` release (`12.5.0`) with fully compatible companion modules (`@nestjs/swagger@12.1.2`, `@nestjs/config@12.1.1`, `@nestjs/platform-express@12.5.0`).
   - *Correction*: Adopted NestJS 12 (`@nestjs/core@12.5.0`). Verified Node 24 engine compatibility (`node >= 20`) and zero peer dependency conflicts.

4. **Flawed Single-Version Query Methodology**:
   - *Why it happened*: I executed single `pnpm view <pkg> version` queries. That command returns only one string and conceals the `dist-tags` context (which reveals whether a version is `latest`, `backport`, `rc`, `beta`, or `legacy`).
   - *Correction*: Codified **ADR-0002**, requiring `pnpm view <pkg> dist-tags` across every evaluated dependency and mandating that the current stable `latest` major is adopted unless an incompatibility is formally proven with evidence.

---

**Plan Verification Sign-off**:  
This document reflects the fully verified active dependency matrix. Application code remains untouched. Ready for Phase 0 Human Gate review (`P0-02`).

# ARCHITECTURE

Status: draft for Phase 0 review. Agents refine this in P0-01 and record changes as ADRs in `docs/adr/`.

## 1. System context

```
 Web (Next.js)  ─┐                        ┌─ FCM / APNs (push)
 Mobile (Expo)  ─┼─ HTTPS ─▶ Gateway/WAF ─▶ API (NestJS) ─┬─ PostgreSQL + PostGIS
 Business portal ┘          (rate limit)      │  stateless  ├─ Redis (cache, rate limit, pub/sub, BullMQ)
                                              │             ├─ S3-compatible storage (media) ◀─ CDN
                                              ▼             ├─ SMS (Termii/Twilio) · Email (Resend)
                                       Workers (NestJS)     └─ Moderation / malware-scan providers
                         fanout · push · media · ttl · purge · webhooks · digests
```

Rules: API and workers are stateless and horizontally scalable. All async work goes through BullMQ. Secrets come from the secret manager at runtime.

## 2. Components

| Component | Responsibility |
|---|---|
| `apps/api` | REST `/v1`, auth, policy layer, WebSocket/SSE gateway, OpenAPI |
| `apps/api` workers (same codebase, separate entrypoint) | fanout, push delivery, media processing, TTL/purge cron, webhook delivery, batching of minor alerts |
| `apps/web` | Landing, guest flow, ticket tracking, business portal, moderation dashboard |
| `apps/mobile` | Resident app: reporting, map/feed, alerts, offline queue |
| `packages/shared` | zod schemas, enums, constants: the single source of contracts |
| `packages/ui-tokens` | Colour, spacing, type tokens for web and mobile |

## 3. Identity model

| Actor | How they authenticate | Scope |
|---|---|---|
| Resident | Phone/email + OTP, passkey optional | Own data, public data |
| Guest | Email + magic link/OTP, or reference + email | Read/comment on tickets tied to that email only |
| Business member | Email + OTP (+ TOTP required for Owner/Admin), SSO optional | Tenant-scoped by `business_id` |
| Moderator/Admin | Email + OTP + TOTP mandatory | Moderation scopes, every action audited |
| Integration | Scoped API key (hashed) + HMAC webhooks | Specific business, specific scopes |

Tokens: access JWT 15 min, refresh rotation with reuse detection (hashed server-side). Web uses `__Host-` HttpOnly Secure SameSite cookies. Mobile stores tokens in Keychain/Keystore. JWT signing keys carry a `kid` for rotation.

Authorization: central policy layer (deny by default) + Postgres RLS as defence in depth. Every handler resolves actor → permission → resource ownership before touching data.

## 4. Ticket lifecycle

`open → acknowledged → in_progress → resolved → archived` (also `merged`, `removed`). Transitions are validated by a state machine, use optimistic locking (`version`), and write a public or internal `ticket_updates` row. Expiry moves `resolved/open` tickets to `archived` by category TTL.

## 5. Geo-fanout (alerts)

1. `POST /v1/tickets` commits the ticket + outbox event in one transaction.
2. Outbox relay publishes `ticket.created` → `fanout` queue (target < 2 s).
3. Fanout worker runs `ST_DWithin(device.last_cell_point, ticket.exact_geom, user.alert_radius)` using a GiST index, in pages of ~500 recipients.
4. For each candidate apply: not the reporter, not blocked/muted, category enabled, severity rules, quiet hours (in the user's IANA zone), reputation weighting, dedupe key `(ticket, user)`.
5. Critical → `push-critical` queue (own workers, bypass quiet hours). High/medium → `push-standard`. Low → `push-batch` aggregated by a cron digest.
6. Push worker sends via FCM/APNs behind a circuit breaker; retries with exponential backoff + jitter; failures to DLQ; invalid tokens removed.
7. Payload contains only `ticket_id`, category, severity, coarse area label, and a validated deep link, with no sensitive text.

Location freshness: devices report significant-change/geofence-exit events; the server stores a coarse cell, not a trail. Home area is the fallback.

## 6. Privacy architecture

- Exact location stored encrypted (column-level AES-256-GCM, key from KMS) alongside a PostGIS geometry used only server-side for matching. Public responses are built from `public_geom` (grid-snapped per category policy in `packages/shared`).
- Anonymous tickets: `reporter_user_id` is stored in a restricted `anonymous_report_links` table readable only by the abuse process (documented, audited), never joined in public queries.
- DTO serializers are allow-list based; no entity is returned directly.
- Logs: pino redaction for tokens, OTPs, emails, phones, coordinates.

## 7. Media pipeline

Client compresses → requests signed PUT URL (type/size limited) → uploads direct to private bucket in `quarantine/` → worker: magic-byte check, malware scan, re-encode, EXIF strip, thumbnails, optional moderation → moves to `public/` with random key → CDN signed URL. Anything failing stays quarantined and is flagged.

## 8. Realtime

WebSocket/SSE subscriptions are by viewport geohash prefixes. Events: `ticket.created`, `ticket.updated`, `ticket.expired`. Redis pub/sub adapter lets any API node serve any client. Events carry public data only. Reconnect with last-event-id; the client falls back to polling.

## 9. Caching

Hot reads (viewport clusters by geohash, business profiles) in Redis with short TTLs; HTTP caching on public endpoints. Invalidate on ticket create/update/expire by geohash tag. Never cache private responses in shared caches.

## 10. Environments

| Env | Purpose | Data |
|---|---|---|
| local | Docker Compose: Postgres+PostGIS, Redis, MinIO, Mailpit | seed/synthetic |
| preview | Per-PR web preview | synthetic |
| staging | Prod-like via Terraform | synthetic only |
| production | Real users | real, encrypted, backed up (PITR) |

## 11. Scaling and capacity notes

Horizontal: API, workers, WebSocket nodes. Vertical first: Postgres primary, Redis. Add PgBouncer, read replicas for map/feed reads, partition `tickets` by `created_at` if growth demands. Document measured limits in `docs/perf/`.

## 12. Key decisions (ADRs)

ADR-0001 stack. Future: outbox pattern, location storage policy, anonymous-link policy, push provider choice, map tile provider.

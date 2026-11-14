# DATA_MODEL (starting point; refine in P1-07 / P2-01 / P3-01)

Conventions: UUIDv7 primary keys, `created_at`/`updated_at` as `timestamptz` (UTC), `deleted_at` for soft delete where noted, `version int` for optimistic locking on mutable workflow rows. Geography columns use SRID 4326 with GiST indexes.

## Identity
| Table | Key columns | Notes |
|---|---|---|
| `users` | id, email_hash, email_enc, phone_hash, phone_enc, role, status, reputation, shadow_banned, tz (IANA), locale, consent flags | Hash for lookup, encrypted for display. Never return raw |
| `devices` | id, user_id, platform, push_token_enc, last_cell (geography point, coarse), last_seen_at, device_fingerprint_hash | Used by fanout and per-device rate limits |
| `sessions` | id, user_id, refresh_family_id, refresh_hash, ua, ip_hash, expires_at, revoked_at | Reuse detection revokes the family |
| `otp_codes` | id, subject_hash, purpose, code_hash, attempts, expires_at, consumed_at | Single use |
| `guest_identities` | id, email_hash, verified_at | One per email; can merge into a user |
| `credentials_totp`, `credentials_passkey`, `recovery_codes` | user_id, secret_enc / public_key, used_at | 2FA and passkeys |
| `api_keys` | id, business_id, prefix, key_hash, scopes[], expires_at, last_used_at, revoked_at | Shown once |

## Tickets
| Table | Key columns | Notes |
|---|---|---|
| `tickets` | id, reference (unique), reporter_user_id?, guest_identity_id?, is_anonymous, category, severity, status, description, exact_geom, exact_enc, public_geom, area_label, occurred_at, expires_at, target_business_id?, merged_into_id?, version, deleted_at | CHECK: exactly one of reporter/guest or anonymous-link row |
| `anonymous_report_links` | ticket_id, user_id | Restricted; abuse process only |
| `ticket_media` | id, ticket_id, storage_key, kind, status (quarantined/clean/rejected), width, height, moderation_result | |
| `ticket_updates` | id, ticket_id, actor_type, actor_id, visibility (public/internal), body, status_from, status_to | Timeline |
| `comments` | id, ticket_id, author_ref, body, deleted_at | Sanitised plain text |
| `confirmations` | ticket_id, user_id, unique(ticket_id, user_id) | "I see this too"; atomic |
| `flags` | id, ticket_id/comment_id, user_id, reason, status | False report / abuse |
| `idempotency_keys` | key, actor_ref, request_hash, response, expires_at | 24 h TTL |

## Businesses
| Table | Key columns |
|---|---|
| `businesses` | id, name, type, reg_number_enc?, status (pending/verified/rejected/suspended), email_verified_at, phone_verified_at, logo_key, hours, deleted_at |
| `business_members` | business_id, user_id, role (owner/admin/responder/viewer) |
| `business_invitations` | id, business_id, email_hash, role, token_hash, expires_at |
| `business_service_areas` | business_id, area geography (polygon or buffered point) |
| `business_documents` | id, business_id, storage_key, kind, review_status |
| `ticket_assignments` | ticket_id, assignee_user_id, assigned_by, sla_due_at |
| `webhook_endpoints`, `webhook_deliveries` | business_id, url, secret_enc, status / attempts, response_code, next_retry_at |

## Preferences and trust
`notification_prefs` (user_id, category, enabled, min_severity), `quiet_hours` (user_id, start, end, tz), `alert_settings` (user_id, home_geom, radius_m), `blocks_mutes` (user_id, target_user_id, kind), `reputation_events` (user_id, delta, reason, ref).

## Operations and compliance
`moderation_actions` + `audit_log` (append-only; actor, action, target, ip_hash, ua, request_id, before/after hash), `outbox_events`, `consents` (user/guest, purpose, granted_at, withdrawn_at), `data_requests` (export/erasure status), `feature_flags` if self-hosted.

## Required indexes (verify with EXPLAIN ANALYZE)
GiST: `tickets.exact_geom`, `tickets.public_geom`, `devices.last_cell`, `alert_settings.home_geom`, `business_service_areas.area`. B-tree: `tickets(status, expires_at)`, `tickets(category, created_at)`, `tickets(target_business_id, status)`, `tickets(reference)` unique, `confirmations(ticket_id, user_id)` unique, `idempotency_keys(key)` unique.

## RLS baseline
Policies on `tickets` (public rows vs owner/guest/business/moderator), `ticket_updates` (internal rows only for business members + moderators), `business_*` (tenant isolation by `business_id`), `guest_*` (own identity only). DB roles: `app_api` (no DDL), `app_worker` (narrow), `app_migrator` (DDL, CI only), `app_readonly` (analytics, no PII).

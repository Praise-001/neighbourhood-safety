# Threat model (STRIDE) — seed for P1-10; agents extend each phase

## Assets
Exact incident locations · reporter identity (esp. anonymous) · guest emails/phones · push tokens · media · business verification documents · moderator/admin sessions · audit log integrity · alert delivery availability.

## Trust boundaries
Internet ↔ gateway/WAF · client ↔ API · API ↔ DB/Redis/storage · API ↔ third parties (SMS, email, push, moderation) · business webhook endpoints (untrusted URLs) · worker ↔ media tools (untrusted files).

## Key threats and required mitigations
| # | Threat (STRIDE) | Scenario | Mitigations | Tests |
|---|---|---|---|---|
| T1 | Spoofing | Attacker registers as a fake security company | Verification workflow, document review, verified badge, moderator 2FA | impersonation test |
| T2 | Spoofing | Guest ticket takeover by guessing reference | Unguessable reference + email match, rate limits, generic errors, lockout | brute-force test |
| T3 | Info disclosure | De-anonymising an anonymous report (joins, timing, metadata, EXIF) | Restricted link table, serializers allow-list, EXIF strip, no user ID in public payloads, timing review | J12 |
| T4 | Info disclosure | Triangulating exact location from coarse coordinates over repeated queries | Deterministic grid snap (no jitter averaging), no exact data in any response, rate limits | coarsening test |
| T5 | Info disclosure | Stalking: tracking someone's home via alerts/reports | No home addresses, coarsening for sensitive categories, report/block, moderation | review |
| T6 | Tampering | Mass assignment sets status/reputation/role | DTO allow-lists | J2 |
| T7 | Tampering | Concurrent merges/confirmations corrupt counters | Locks, atomic ops, unique constraints | J9 |
| T8 | Repudiation | Moderator denies removing content | Append-only audit log | audit test |
| T9 | DoS | Alert spam/flood to users; fanout abuse | Per-user/device/IP limits, dedupe, reputation weighting, shadow-ban, queue caps | load/abuse tests |
| T10 | DoS | OTP/SMS pumping | Geo-allow-list, per-number/IP limits, cost caps, alerts | J3 |
| T11 | Elevation | IDOR across users/tenants | Policy layer + RLS | J1, J11 |
| T12 | Elevation | SSRF via business webhook URL | safe-fetch, IP blocks, isolated egress | J6 |
| T13 | Tampering | Malicious media (polyglots, EXIF, malware) | Quarantine, magic bytes, re-encode, scan | J5 |
| T14 | Info disclosure | Push notification leaks content on lock screen | Minimal payloads, coarse area label only | payload test |
| T15 | Tampering | False reports to harass individuals/businesses | Flags, reputation, moderation, rate limits | abuse tests |
| T16 | Info disclosure | Token theft (XSS/CSRF) | CSP, HttpOnly cookies, CSRF tokens, short TTL, rotation | J8, CSRF test |

## Review cadence
Revisit at the end of every phase and before launch; record changes via PR to this file.

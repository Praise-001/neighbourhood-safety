# Data classification and protection

| Data | Class | Storage | Public exposure | Retention |
|---|---|---|---|---|
| Email, phone | Personal | Hash (lookup) + encrypted (display) | Never | Account life + 30 d after deletion request |
| Passwords (if any) | Secret | argon2id hash | Never | Account life |
| OTP / magic-link tokens | Secret | Hash, short TTL | Never | ≤ 24 h |
| Refresh tokens | Secret | Hash | Never | Until expiry/revoke |
| Exact incident location | Sensitive | Encrypted + geometry for server-side matching | Never | Per ticket retention policy |
| Public (coarse) location | Public | Plain | Yes | Per ticket TTL then archived |
| Reporter ID on anonymous ticket | Highly sensitive | Restricted table | Never | Shortest feasible; documented |
| Push tokens | Personal | Encrypted | Never | Until device removed/invalid |
| Device location cell | Sensitive | Coarse cell only, no trail | Never | Overwritten on update |
| Media | Personal/sensitive | Private bucket, CDN signed URLs, EXIF stripped | Via moderation-cleared URLs | With ticket |
| Business documents | Sensitive | Private bucket | Never | Until verification closed + legal minimum |
| Audit log | Integrity-critical | Append-only | Never | ≥ 2 years |
| Analytics events | Pseudonymous | PostHog, consent-aware, no PII | Never | 13 months |

Rules: hash what you only verify; encrypt what you must read back; never log any of the above; every field above must have a DSAR export/erasure behaviour defined before P8-05.

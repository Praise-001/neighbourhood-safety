# Runbook: suspected data breach

1. **Declare** an incident; assign incident lead and scribe; open a private channel.
2. **Contain**: revoke affected credentials/sessions, rotate keys (`secret-leak.md`), disable affected endpoints with feature flags, snapshot logs/evidence (do not delete).
3. **Assess**: what data, which users, since when, how. Use the audit log and access logs.
4. **Notify**: legal counsel decides. NDPR/GDPR-style regulators typically require notice within 72 hours of awareness; notify affected users without undue delay when risk is high. (Confirm current local law with counsel.)
5. **Remediate**: patch root cause, add regression test, update `docs/threat-model.md` and the checklist.
6. **Post-mortem** within 5 working days (blameless) with action items added to `TASKS.md`.

Contacts to fill in before launch: incident lead, legal, DPO, hosting provider, SMS/email/push providers.

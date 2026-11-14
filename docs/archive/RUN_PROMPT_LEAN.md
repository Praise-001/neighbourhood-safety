# RUN_PROMPT_LEAN.md: Scope-change prompts

Use after copying `docs/adr/0003-zero-cost-student-scope.md` and the new `TASKS.md` into the repo and committing them.

---

## PROMPT A: Re-plan (paste first)

```
SCOPE CHANGE. This is a zero-cost academic (IT project) build, not a production launch.
Read docs/adr/0003-zero-cost-student-scope.md and the new TASKS.md in full first. Where they
conflict with any other document, ADR-0003 wins. The protocol in RUN_PROMPT.md (Prompt 1:
source of truth, per-task loop, anti-hallucination rules, stop conditions) still applies, except
where ADR-0003 simplifies it. Do not write application code yet.

Do task P0-02 on a new branch `docs/scope-zero-cost`:
1. Rewrite docs/PLAN.md to match ADR-0003. Keep it short (target under 150 lines): stack,
   folder tree (single Next.js app + supabase/ migrations), verified versions (reuse the
   ADR-0002 policy, show `dist-tags` output), top-5 risks, and a phase schedule.
2. Verify every free-tier claim you rely on (Supabase, Vercel or Cloudflare Pages, email
   provider, map tiles, geocoding, GitHub Actions, pg_cron, Web Push) by reading the official
   pricing/docs page. For each, record: limit that matters, whether a card is required, source
   URL, date checked. If anything requires a card or looks unsuitable, propose a free
   alternative. Do NOT create accounts, and do not ask me for paid keys.
3. Shorten docs/ARCHITECTURE.md to match the lean stack (remove queue/Redis/API server parts).
4. Update docs/STANDARDS_CHECKLIST.md: mark rows out of scope as `N/A` with the reason
   "out of scope per ADR-0003". Keep the rows listed in ADR-0003 section 5 as required. Do not
   delete any rows.
5. Update AGENTS.md: lanes become app/db/infra; "every new endpoint" rule becomes "every route
   handler, server action, RPC and table: authorization/RLS, validation, rate limit where
   relevant, tests". Keep all other hard rules.
6. Update README.md quick start: no Docker; pnpm + hosted Supabase dev project.
7. List exactly which free accounts I must create, in which task order, with the steps. 
8. Flag anything in ADR-0003 or TASKS.md that you think is wrong, unsafe, or missing, with
   evidence.
Commit, report in the standard format, mark P0-02 done, and STOP. P0-03 is my approval.
```

## PROMPT B: Approval to start building

```
approved: Phase 0 (lean scope). Begin Phase 1 per RUN_PROMPT.md protocol, one task at a time,
using TASKS.md as the order of work. Stop at the Phase 1 gate. If any step needs me to create an
account or paste a key, stop and give me exact steps. Never use a service that needs a card.
```

## PROMPT C: Phase gate review (use before approving each phase)

```
Act as an independent reviewer of Phase <N>. Re-run lint, typecheck, tests and scans now and
show real output. Verify each Gate criterion with evidence. Audit the diff against AGENTS.md
hard rules and the ADR-0003 security floor. Try to break it (IDOR, RLS bypass, enumeration,
XSS, mass assignment, race conditions, privacy leaks) and show which tests cover each; write
missing tests. Output PASS or FAIL with a prioritized fix list. Do not self-approve.
```

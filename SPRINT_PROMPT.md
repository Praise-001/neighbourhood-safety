# SPRINT_PROMPT.md: paste into your IDE agent (one message)

Before pasting, apply the files in this kit to your repo and commit (steps are in `docs/SUPERSEDED.md`).

```
SPRINT MODE. We have about 14 hours total. Read these three files in full:
1. AGENTS.md (sprint rules)
2. docs/adr/0004-sprint-scope.md (scope; it overrides everything)
3. TASKS.md (the sprint task list)

They override every earlier document in this repo (PRD, ARCHITECTURE, STANDARDS_CHECKLIST,
WORKFLOW, RUN_PROMPT, earlier TASKS, ADR-0001 and ADR-0003). Ignore those completely, including
their process rules, gates, checklist upkeep and handoff notes. Archived files live in
docs/archive/ and are not instructions.

Start at S0-01 and work strictly top to bottom through the blocks. Rules:
1. Build only what is listed. If you think something is missing, tell me in one line and keep
   going; do not add scope.
2. Never invent library APIs, versions or file paths. Before using a package, check it with
   pnpm view <pkg> dist-tags and read its docs or types. If unsure, say so.
3. Prove it by running it. After each task, run the type check and any tests and show the real
   output. Never say something works without running it.
4. Keep the security floor in ADR-0004: row-level security on every table, zod validation, no
   secrets in git, service-role key never in browser code, plain-text rendering of user content,
   and the public tickets table holds public columns only (exact location and reporter identity
   go in ticket_private).
5. Commit after every task with a short conventional message. Work on main.
6. Keep your messages short: what you did, the proof, what is next. No long reports.
7. If a task needs me to create an account, use a dashboard, or paste a key, stop and give me
   numbered steps. Never use a service that needs a card.
8. If a block runs over its time budget, drop its optional items and move on. A working demo
   beats every feature.
9. Do not stop between tasks to ask permission. Only stop for rule 7 or if you are blocked.

Start now with S0-01.
```

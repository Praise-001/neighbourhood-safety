# FIXES.md: post-deploy fixes (sprint scope still applies)

Live site reviewed: https://neighbourhood-safety-app.vercel.app/
Scope and rules are unchanged: `AGENTS.md`, `docs/adr/0004-sprint-scope.md`. Fix only what is listed here. No new features. One commit per fix, show real command output as proof, and stop only when an owner action is needed.

## How to work this list
Work top to bottom. For each fix: reproduce or inspect, fix the cause, verify, commit (`fix: ...`), report in 3 lines (what, proof, next). Do not guess: read the actual error, header or response first.

---

## F1 (PRIORITY): Map shows no terrain, roads or labels, only the marker

**Symptom (owner report):** On the map page, the report location picker and the alerts home picker, the map area is blank. The pin marker draws, but there are no tiles: no roads, terrain, labels or land and water.

**What this usually means:** the map object initialised (the marker appears) but its style or tiles failed to load. Find which of these it is, with evidence, in this order:

1. **Missing env var on Vercel.** If the style URL comes from an env var (for example `NEXT_PUBLIC_MAP_STYLE_URL`), check it exists in the Vercel project settings, not only in `.env.local`. `NEXT_PUBLIC_*` values are baked in at build time, so a redeploy is needed after adding one. Owner action if missing: give exact steps.
2. **Content Security Policy blocking map resources.** The security headers added in S0-04 may block the style, tiles, fonts, sprites or the MapLibre web worker. Read the CSP in `next.config` or middleware (check the real response header: `curl.exe -I https://neighbourhood-safety-app.vercel.app/map`). Make sure the policy allows the exact hosts the map uses in `connect-src` and `img-src`, plus `worker-src blob:` and `img-src data: blob:` as MapLibre requires. Verify against the MapLibre documentation, do not assume. Do not loosen the CSP beyond the specific hosts and schemes needed (no `*`, no `unsafe-eval` unless proven necessary).
3. **MapLibre stylesheet not imported.** Confirm `maplibre-gl/dist/maplibre-gl.css` is imported once in the map component or layout.
4. **Style or tile URL wrong, needs a key, or blocks us.** Test it directly: `curl.exe -I "<style url>"` and fetch one tile URL. Expect HTTP 200 and a sensible content type. If it needs an API key, a card, or refuses requests, replace it.
5. **Map container height.** Confirm the container has an explicit height at every breakpoint.

**Tile source requirements (zero cost, no card):**
- Pick one provider and read its official terms and attribution requirement before using it. Candidates to evaluate: OpenFreeMap, plain OpenStreetMap raster tiles in a minimal raster style (check the OSM tile usage policy for a demo of this size), or another free provider that needs no card. The MapLibre demo tiles style shows only a coarse world map without roads, so it is not enough for this project.
- Record the provider, its terms URL and the date checked in the README.
- Show the required attribution on the map (the MapLibre attribution control).

**Scope of the fix:** there are three map views (map page, report location picker, alerts home picker). Put the style URL and the map initialisation in one shared place and use it everywhere, so it is fixed once.

**Proof required:**
- Output showing the style and a sample tile return HTTP 200 (`curl.exe -I`).
- The CSP header from the deployed site after the fix.
- A statement of what you checked on the deployed site. If you cannot view the browser console yourself, say so and ask the owner to open DevTools (F12) on `/map`, check the Console and the Network tab for red or blocked requests, and send you the exact messages. Do not claim the map is fixed without evidence.
- Zoom, pan and the marker still work, and the pin picker still returns coordinates.

---

## F2: Page shows "Loading Neighbourhood Safety..." as the initial content
The landing page HTML contains a loading placeholder. Confirm it disappears in a normal browser. If the home page is client-only rendered for no good reason, render the static content on the server so it appears immediately. Make sure loading states have a timeout and an error message, not an endless spinner.

## F3: Hard-coded and over-claiming statistics
The landing page shows static numbers ("30+ active incidents", "100% privacy stripping", "0 cost").
- Either compute the incident count from the database (count of visible, non-expired tickets) or remove it.
- Reword "100% privacy stripping" to something true and specific, for example "Photo location data is removed before upload; sensitive categories show approximate locations only." Only keep claims you have verified in the code.

## F4: Emergency numbers
The banner lists "911 / 112 / 999". Show the number(s) for the owner's country only (112 for Nigeria). Keep the "Not for real emergencies" disclaimer.

## F5: Admin route protection
The admin link is visible to everyone. Confirm `/admin` is protected on the server (session check plus admin role check) and that the data queries are protected by row-level security, not only by hiding the UI. Add a test: logged-out and normal-user access to admin data fails. Show the output.

## F6: Magic-link sign-in redirect on the deployed site
Make the site URL come from an env var (`NEXT_PUBLIC_SITE_URL`) so magic links and redirects use the Vercel domain, not localhost. Add it to `.env.example`. **Owner action:** in Supabase → Authentication → URL Configuration, set the Site URL to the Vercel address and add it to the redirect URLs; give exact steps and wait for "done".

## F7: Realtime must be enabled on the public `tickets` table
Alerts fail silently if Realtime is not enabled for the table. Enable it through a SQL migration (add the table to the `supabase_realtime` publication) instead of a dashboard click, so it is reproducible. Confirm the `ticket_private` table is **not** in the publication. Verify with a query that lists the publication's tables and show the output. Then re-test the two-window alert (inside the radius: banner; outside: none).

## F8: Privacy proof script (for the report)
Add a small test or script that, using only the public anon key, asserts:
- `ticket_private` returns no rows (or a permission error) to anonymous callers.
- Public `tickets` rows contain no reporter id, email hash or exact location columns.
- A normal user cannot hide tickets or read other users' private rows.
Also add a check that fails if `service_role` appears in any client-side code or any `NEXT_PUBLIC_` variable (`git grep -i service_role` plus a scan of `.env.example`). Show the output.

## F9: Final demo and docs (this finishes S6-04 and S7)
- README: setup steps, short architecture note, the map provider and its terms, free-tier notes (Supabase free projects pause after inactivity: wake before a demo), and the future-work list (everything cut in ADR-0004).
- Write a short demo script (`docs/DEMO.md`): report without an account, see it on the map with real map detail, alert in a second window, flag three times, admin removes and bans.
- List what is still unverified or known to be limited, honestly.

---

## When you stop
Stop only for an owner action (F1 env var if missing, F6 Supabase URL setting, final demo check). Give numbered steps and wait for "done, continue".

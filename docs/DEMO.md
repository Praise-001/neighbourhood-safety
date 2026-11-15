# Demonstration Rehearsal Script

**Project:** Neighbourhood Safety  
**Demo Target:** Live deployed site (`https://neighbourhood-safety-app.vercel.app`)  
**Scope:** Zero-cost academic demonstration with synthetic data (ADR-0004).

---

## 1. Prerequisites Before Demo

1. **Wake Free Database:** Supabase free-tier projects pause after inactivity. Open the Supabase dashboard or visit `https://neighbourhood-safety-app.vercel.app/` 2 minutes before your presentation to ensure the database instance is warm.
2. **Open Two Browser Windows:**
   - **Window A (Resident 1):** Main browser tab at `https://neighbourhood-safety-app.vercel.app/map`
   - **Window B (Resident 2):** Incognito / private browsing window at `https://neighbourhood-safety-app.vercel.app/alerts`

---

## 2. Step-by-Step Demonstration Flow

### Step 1: Perimeter Alerts Setup (Window B)
1. In **Window B**, navigate to `/alerts`.
2. Observe the interactive OpenFreeMap map showing Manchester, UK.
3. Drag the marker pin to Manchester Piccadilly (`-2.2309, 53.4774`) and select a **1 km** alert radius.
4. Click **"Save Alert Preferences"**. Notice the confirmation toast ("Alert radius saved locally"). Window B is now listening via Supabase Realtime for any new incident within 1 km.

### Step 2: Instant Anonymous Incident Report (Window A)
1. In **Window A**, click **"+ Report"** in the top navbar (`/report`).
2. Fill out an incident without creating an account:
   - **Category:** `road_hazard` or `vandalism`
   - **Severity:** `medium`
   - **Title:** "Broken Glass and Debris Near Station Approach"
   - **Description:** "Large amount of broken bottles scattered across the cycle lane."
   - **Location:** Drag the pin marker near Manchester Piccadilly (within 1 km of Window B's pin).
   - **Privacy toggle:** Leave "Report anonymously" checked (or provide an email).
   - **Photo:** (Optional) Attach any JPEG/PNG file. Note that EXIF/GPS metadata is stripped in-browser before upload.
3. Click **"Submit Incident Report"**.
4. Observe the immediate success page showing your unique Reference Code (e.g., `MCR-4821`).

### Step 3: Realtime In-App Notification (Window B)
1. Look at **Window B** immediately after submitting in Window A.
2. Observe the persistent, high-contrast banner appear at the top of Window B:
   > 🔔 **New Incident in Your Perimeter:** Broken Glass and Debris Near Station Approach (~350 m away) · *View Dossier →*
3. Click **"View Dossier"** to open `/tickets/[id]`. Note that the exact coordinates and reporter email are completely invisible to Resident 2.

### Step 4: Live Map & Clustering Exploration (Window A)
1. In **Window A**, navigate to `/map`.
2. See the new incident rendered on the vector map alongside the 30 synthetic baseline incidents.
3. Zoom in and out to demonstrate dynamic MapLibre cluster grouping.
4. Toggle categories and filter by time window (Last 24 Hours).
5. Switch to **"Feed View"** to inspect the distance-ordered list.

### Step 5: Community Verification & Crowd Flags (Window A & B)
1. In **Window B**, on the incident dossier page (`/tickets/[id]`), click **"I See This Too"** to increment the community confirmation count.
2. Demonstrate moderation: click **"Flag as Inaccurate or Inappropriate"**.
3. Select a reason (e.g. "False or misleading report") and submit. Flag count increments to 1.
4. Repeat flagging from 2 other sessions/devices (or test client tokens). When `flag_count >= 3`, the PostgreSQL trigger automatically marks `hidden = true`, instantly removing the incident from public map queries.

### Step 6: Administrator Review & Moderation (Window A)
1. In **Window A**, sign in with an administrator account at `/auth` (or access `/admin`).
2. Navigate to `/admin`.
3. Observe the incident in the **Moderation Queue** with status `Auto-Hidden (≥3 Flags)`.
4. Review the details:
   - Click **"Restore Report"** to clear flags and restore public visibility, OR
   - Click **"Remove"** to permanently delete the false report, OR
   - Click **"Ban Reporter"** to blacklist malicious actors and hide all associated reports.

---

## 3. Known Limitations & Unverified Items (Honest Disclosure)

In adherence to academic integrity and the sprint scope defined in `docs/adr/0004-sprint-scope.md`:
1. **Web Push Background Notifications:** Browser push notifications via Service Workers were cut from sprint scope due to Safari/iOS VAPID requirements; notifications are delivered via realtime in-app perimeter banners.
2. **Reverse Geocoding Rate Limits:** Address search uses OpenStreetMap Nominatim with a 1 req/sec server-side bottleneck to comply strictly with the free tier usage policy.
3. **Synthetic Baseline:** All 30 seeded incidents are synthetic simulations centered around Manchester, UK, generated for academic testing.
4. **Free Tier Pausing:** Supabase free databases spin down after prolonged inactivity; warm-up is required before initial live demonstrations.
